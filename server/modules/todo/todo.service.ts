import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { applications, todos } from '@server/database/schema';
import {
  parseChinaTimestamp,
  serializeStoredTimestamp,
} from '@server/modules/application/application-time';
import type {
  TodoRecord,
  TodoSaveInput,
  TodoScope,
  TodoSummary,
} from '@shared/types';
import { getChinaDayRange } from './todo-time';

type TodoRow = typeof todos.$inferSelect;
type TodoJoinedRow = {
  todo: TodoRow;
  application: { id: string; company: string; position: string } | null;
};

@Injectable()
export class TodoService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    userId: string,
    scope: TodoScope = 'all',
    search = '',
  ): Promise<TodoRecord[]> {
    const rows: TodoJoinedRow[] = await this.selectOwned(userId);
    const keyword: string = search.trim().toLocaleLowerCase('zh-CN');
    const { start, end } = getChinaDayRange();
    return rows
      .map(serializeTodo)
      .filter((todo: TodoRecord) => matchesScope(todo, scope, start, end))
      .filter((todo: TodoRecord) => {
        if (!keyword) return true;
        return [
          todo.title,
          todo.notes,
          todo.application?.company,
          todo.application?.position,
        ].some((value?: string) => value?.toLocaleLowerCase('zh-CN').includes(keyword));
      });
  }

  async summary(userId: string): Promise<TodoSummary> {
    const items: TodoRecord[] = await this.list(userId, 'all');
    const { start, end } = getChinaDayRange();
    const pending: TodoRecord[] = items.filter((todo: TodoRecord) => !todo.completedAt);
    const overdue: TodoRecord[] = pending.filter(
      (todo: TodoRecord) => Boolean(todo.dueAt) && new Date(todo.dueAt!).getTime() < start.getTime(),
    );
    const today: TodoRecord[] = pending.filter(
      (todo: TodoRecord) =>
        Boolean(todo.dueAt) &&
        new Date(todo.dueAt!).getTime() >= start.getTime() &&
        new Date(todo.dueAt!).getTime() <= end.getTime(),
    );
    const reminderDue: TodoRecord[] = pending.filter(
      (todo: TodoRecord) =>
        Boolean(todo.reminderAt) && new Date(todo.reminderAt!).getTime() <= Date.now(),
    );
    const priorityItems: TodoRecord[] = Array.from(
      new Map(
        [...reminderDue, ...overdue, ...today].map((todo: TodoRecord) => [todo.id, todo]),
      ).values(),
    );
    return {
      overdueCount: overdue.length,
      todayCount: today.length,
      incompleteCount: pending.length,
      items: priorityItems.slice(0, 5),
    };
  }

  async create(userId: string, input: TodoSaveInput): Promise<TodoRecord> {
    const title: string = normalizeTitle(input.title);
    await this.assertApplicationOwnership(userId, input.applicationId);
    if (!input.allowDuplicate) {
      const duplicates: TodoRow[] = await this.db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.userId, userId),
            eq(todos.title, title),
            input.applicationId
              ? eq(todos.applicationId, input.applicationId)
              : isNull(todos.applicationId),
            isNull(todos.completedAt),
          ),
        );
      if (duplicates.length > 0) {
        throw new ConflictException('已有同名未完成待办，可查看原任务或选择仍然创建');
      }
    }
    const dueAt: string | null = normalizeTime(input.dueAt);
    const reminderAt: string | null = normalizeTime(input.reminderAt);
    const now: string = new Date().toISOString();
    const [maxRow]: { max: number | null }[] = await this.db
      .select({ max: sql<number | null>`max(${todos.sortOrder})` })
      .from(todos)
      .where(eq(todos.userId, userId));
    const [row]: TodoRow[] = await this.db
      .insert(todos)
      .values({
        userId,
        applicationId: input.applicationId || null,
        title,
        notes: input.notes?.trim() || null,
        dueAt,
        reminderAt,
        duePrecision: normalizeDuePrecision(input.duePrecision),
        isImportant: Boolean(input.isImportant),
        sortOrder: input.sortOrder ?? (Number(maxRow?.max) || 0) + 1,
        completedAt: input.completed ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return this.getOwned(userId, row.id);
  }

  async update(
    userId: string,
    id: string,
    input: TodoSaveInput,
  ): Promise<TodoRecord> {
    const existing: TodoRow = await this.assertTodoOwnership(userId, id);
    await this.assertApplicationOwnership(userId, input.applicationId);
    const now: string = new Date().toISOString();
    const reminderAt: string | null = normalizeTime(input.reminderAt);
    await this.db
      .update(todos)
      .set({
        applicationId:
          input.applicationId === undefined
            ? existing.applicationId
            : input.applicationId || null,
        title: input.title === undefined ? existing.title : normalizeTitle(input.title),
        notes: input.notes === undefined ? existing.notes : input.notes.trim() || null,
        dueAt: input.dueAt === undefined ? existing.dueAt : normalizeTime(input.dueAt),
        reminderAt:
          input.reminderAt === undefined ? existing.reminderAt : reminderAt,
        duePrecision:
          input.duePrecision === undefined
            ? existing.duePrecision ?? 'hour'
            : normalizeDuePrecision(input.duePrecision),
        remindedAt:
          input.reminderAt !== undefined && reminderAt !== existing.reminderAt
            ? null
            : existing.remindedAt,
        reminderAttempts:
          input.reminderAt !== undefined && reminderAt !== existing.reminderAt
            ? 0
            : existing.reminderAttempts,
        isImportant: input.isImportant ?? existing.isImportant,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        completedAt:
          input.completed === undefined
            ? existing.completedAt
            : input.completed
              ? existing.completedAt || now
              : null,
        updatedAt: now,
      })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
    return this.getOwned(userId, id);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    await this.assertTodoOwnership(userId, id);
    await this.db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
    return true;
  }

  private selectOwned(userId: string): Promise<TodoJoinedRow[]> {
    return this.db
      .select({
        todo: todos,
        application: {
          id: applications.id,
          company: applications.company,
          position: applications.position,
        },
      })
      .from(todos)
      .leftJoin(
        applications,
        and(
          eq(todos.applicationId, applications.id),
          eq(applications.userId, userId),
        ),
      )
      .where(eq(todos.userId, userId))
      .orderBy(
        asc(todos.completedAt),
        desc(todos.isImportant),
        sql`${todos.dueAt} ASC NULLS LAST`,
        desc(todos.createdAt),
      );
  }

  private async getOwned(userId: string, id: string): Promise<TodoRecord> {
    const rows: TodoJoinedRow[] = await this.selectOwned(userId);
    const row: TodoJoinedRow | undefined = rows.find(
      (item: TodoJoinedRow) => item.todo.id === id,
    );
    if (!row) throw new NotFoundException('待办不存在');
    return serializeTodo(row);
  }

  private async assertTodoOwnership(userId: string, id: string): Promise<TodoRow> {
    const [row]: TodoRow[] = await this.db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
    if (!row) throw new NotFoundException('待办不存在');
    return row;
  }

  private async assertApplicationOwnership(
    userId: string,
    applicationId?: string | null,
  ): Promise<void> {
    if (!applicationId) return;
    const [row]: { id: string }[] = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)));
    if (!row) throw new NotFoundException('关联岗位不存在');
  }
}
function normalizeTitle(value: string): string {
  const title: string = value?.trim() || '';
  if (!title) throw new BadRequestException('请输入待办内容');
  if (title.length > 255) throw new BadRequestException('待办内容不能超过 255 个字');
  return title;
}

function normalizeTime(value?: string | null): string | null {
  if (!value) return null;
  const normalized: string | null = parseChinaTimestamp(value);
  if (!normalized) throw new BadRequestException('日期时间格式不正确');
  return normalized;
}

function normalizeDuePrecision(value?: string): 'date' | 'hour' {
  if (value === undefined || value === 'hour') return 'hour';
  if (value === 'date') return 'date';
  throw new BadRequestException('截止时间精度不正确');
}

function serializeTodo(row: TodoJoinedRow): TodoRecord {
  return {
    id: row.todo.id,
    applicationId: row.todo.applicationId,
    title: row.todo.title,
    notes: row.todo.notes || undefined,
    dueAt: serializeStoredTimestamp(row.todo.dueAt),
    reminderAt: serializeStoredTimestamp(row.todo.reminderAt),
    duePrecision: row.todo.duePrecision === 'date' ? 'date' : 'hour',
    isImportant: row.todo.isImportant,
    sortOrder: row.todo.sortOrder,
    completedAt: serializeStoredTimestamp(row.todo.completedAt),
    createdAt: serializeStoredTimestamp(row.todo.createdAt) || '',
    updatedAt: serializeStoredTimestamp(row.todo.updatedAt) || '',
    application: row.application,
  };
}

function matchesScope(
  todo: TodoRecord,
  scope: TodoScope,
  start: Date,
  end: Date,
): boolean {
  if (scope === 'completed') return Boolean(todo.completedAt);
  if (todo.completedAt) return scope === 'all';
  if (scope === 'important') return todo.isImportant;
  if (scope === 'planned') return Boolean(todo.dueAt);
  if (scope === 'today') {
    if (!todo.dueAt) return false;
    const time: number = new Date(todo.dueAt).getTime();
    return time >= start.getTime() && time <= end.getTime();
  }
  return true;
}
