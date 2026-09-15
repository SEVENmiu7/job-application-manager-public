import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ListChecks,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api';
import { TodoComposer } from '@/components/todo/TodoComposer';
import { formatTodoDue } from '@/components/todo/todo-time';
import { PageHeader, StatTintCard } from '@/components/page-ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TODO_DATA_CHANGED_EVENT } from '@/lib/todo-events';
import { cn } from '@/lib/utils';
import type {
  ApplicationRecord,
  TodoRecord,
  TodoSaveInput,
  TodoScope,
} from '@shared/types';
import { TodoDetailSheet } from './TodoDetailSheet';

const FILTERS: { value: TodoScope; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'planned', label: '计划' },
  { value: 'important', label: '重要' },
  { value: 'completed', label: '已完成' },
];

type TodoGroupKey = 'overdue' | 'today' | 'upcoming' | 'undated' | 'completed';

const GROUP_META: Record<TodoGroupKey, { label: string; description: string }> = {
  overdue: { label: '已逾期', description: '优先处理，减少悬而未决' },
  today: { label: '今天', description: '今天需要推进的事项' },
  upcoming: { label: '接下来', description: '已有明确时间的计划' },
  undated: { label: '无日期', description: '暂未安排具体时间' },
  completed: { label: '已完成', description: '完成的任务会保留在这里' },
};

export default function TodoList() {
  const [scope, setScope] = useState<TodoScope>('all');
  const [search, setSearch] = useState<string>('');
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selected, setSelected] = useState<TodoRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [completedOpen, setCompletedOpen] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<TodoRecord | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [todoItems, applicationItems] = await Promise.all([
        api.listTodos(scope, search),
        applications.length === 0 ? api.listApplications() : Promise.resolve(applications),
      ]);
      setTodos(todoItems);
      setApplications(applicationItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '待办加载失败');
    } finally {
      setLoading(false);
    }
  }, [applications, scope, search]);

  useEffect(() => {
    const timer: number = window.setTimeout(() => void load(), 180);
    const handleChange = (): void => void load();
    window.addEventListener(TODO_DATA_CHANGED_EVENT, handleChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(TODO_DATA_CHANGED_EVENT, handleChange);
    };
  }, [load]);

  useEffect(() => {
    if (scope === 'completed') setCompletedOpen(true);
  }, [scope]);

  const groups = useMemo(() => groupTodos(todos), [todos]);
  const pendingCount: number = todos.filter((todo: TodoRecord) => !todo.completedAt).length;
  const importantCount: number = todos.filter(
    (todo: TodoRecord) => todo.isImportant && !todo.completedAt,
  ).length;
  const overdueCount: number = groups.overdue.length;

  const update = async (todo: TodoRecord, changes: Partial<TodoSaveInput>): Promise<void> => {
    try {
      const next: TodoRecord = await api.updateTodo(todo.id, {
        title: todo.title,
        ...changes,
      });
      setSelected((current) => (current?.id === next.id ? next : current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    }
  };

  const remove = async (todo: TodoRecord): Promise<void> => {
    try {
      await api.deleteTodo(todo.id);
      if (selected?.id === todo.id) setSelected(null);
      toast.success('待办已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-24">
      <PageHeader
        eyebrow="行动计划"
        title="求职待办"
        description="把每一次跟进变成清晰、可完成的下一步。"
        actions={
          <div className="grid grid-cols-3 gap-2">
            <StatTintCard label="待完成" value={pendingCount} icon={<ListChecks />} tone="teal" />
            <StatTintCard label="已逾期" value={overdueCount} icon={<CircleAlert />} tone="red" />
            <StatTintCard label="重要" value={importantCount} icon={<Star />} tone="purple" />
          </div>
        }
      />

      <section className="glass-panel p-4 md:p-5">
        <TodoComposer applications={applications} onCreated={() => void load()} />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="待办筛选">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={scope === filter.value}
                className={cn(
                  'shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                  scope === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground-muted hover:bg-muted hover:text-foreground',
                )}
                onClick={() => setScope(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索任务或岗位"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-busy={loading}>
        {loading && todos.length === 0 ? (
          <div className="glass-panel p-10 text-center text-sm text-muted-foreground">正在整理待办…</div>
        ) : todos.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <CheckCircle2 className="mx-auto size-10 text-primary/70" />
            <h2 className="mt-4 text-lg font-bold text-foreground">这里暂时很清爽</h2>
            <p className="mt-1 text-sm text-muted-foreground">添加一个明确的小行动，求职会更有掌控感。</p>
          </div>
        ) : (
          (['overdue', 'today', 'upcoming', 'undated', 'completed'] as TodoGroupKey[]).map(
            (key: TodoGroupKey) => {
              const items: TodoRecord[] = groups[key];
              if (items.length === 0) return null;
              if (key === 'completed' && !completedOpen) {
                return (
                  <button
                    key={key}
                    type="button"
                    className="glass-panel flex w-full items-center justify-between px-5 py-4 text-left"
                    onClick={() => setCompletedOpen(true)}
                  >
                    <span className="font-semibold text-foreground">已完成</span>
                    <span className="text-sm text-muted-foreground">{items.length} 项 · 点击展开</span>
                  </button>
                );
              }
              return (
                <TodoGroup
                  key={key}
                  groupKey={key}
                  items={items}
                  onSelect={setSelected}
                  onUpdate={update}
                  onRemove={async (todo) => setPendingDelete(todo)}
                  onCollapse={key === 'completed' ? () => setCompletedOpen(false) : undefined}
                />
              );
            },
          )
        )}
      </section>

      <TodoDetailSheet
        todo={selected}
        applications={applications}
        onClose={() => setSelected(null)}
        onUpdate={update}
        onRemove={async (todo) => setPendingDelete(todo)}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这项待办？</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}”删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                void remove(pendingDelete);
                setPendingDelete(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function TodoGroup({
  groupKey,
  items,
  onSelect,
  onUpdate,
  onRemove,
  onCollapse,
}: {
  groupKey: TodoGroupKey;
  items: TodoRecord[];
  onSelect: (todo: TodoRecord) => void;
  onUpdate: (todo: TodoRecord, changes: Partial<TodoSaveInput>) => Promise<void>;
  onRemove: (todo: TodoRecord) => Promise<void>;
  onCollapse?: () => void;
}) {
  const meta = GROUP_META[groupKey];
  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-bold text-foreground">{meta.label}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <button type="button" className="text-xs font-semibold text-muted-foreground" onClick={onCollapse}>
          {onCollapse ? '收起' : `${items.length} 项`}
        </button>
      </div>
      <div className="divide-y divide-border">
        {items.map((todo: TodoRecord) => (
          <article
            key={todo.id}
            className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/45 sm:px-5"
          >
            <Checkbox
              checked={Boolean(todo.completedAt)}
              onCheckedChange={() => void onUpdate(todo, { completed: !todo.completedAt })}
              aria-label={todo.completedAt ? '恢复待办' : '完成待办'}
            />
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(todo)}>
              <p className={cn('truncate text-sm font-semibold text-foreground', todo.completedAt && 'text-muted-foreground line-through')}>
                {todo.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {todo.dueAt && <span className="flex items-center gap-1"><Clock3 className="size-3" />{formatTodoDue(todo.dueAt, todo.duePrecision)}</span>}
                {todo.application && <span>{todo.application.company} · {todo.application.position}</span>}
                {!todo.dueAt && !todo.application && <span>点击补充时间或关联岗位</span>}
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(todo.isImportant ? 'text-amber-500' : 'text-muted-foreground')}
              onClick={() => void onUpdate(todo, { isImportant: !todo.isImportant })}
              aria-label={todo.isImportant ? '取消重要' : '标记重要'}
            >
              <Star className={cn('size-4', todo.isImportant && 'fill-current')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void onRemove(todo)} aria-label="删除待办">
              <Trash2 className="size-4" />
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}

function groupTodos(todos: TodoRecord[]): Record<TodoGroupKey, TodoRecord[]> {
  const groups: Record<TodoGroupKey, TodoRecord[]> = { overdue: [], today: [], upcoming: [], undated: [], completed: [] };
  const now: Date = new Date();
  const china: Date = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const start: number = Date.UTC(china.getUTCFullYear(), china.getUTCMonth(), china.getUTCDate()) - 8 * 60 * 60 * 1000;
  const end: number = start + 24 * 60 * 60 * 1000;
  for (const todo of todos) {
    if (todo.completedAt) groups.completed.push(todo);
    else if (!todo.dueAt) groups.undated.push(todo);
    else if (new Date(todo.dueAt).getTime() < start) groups.overdue.push(todo);
    else if (new Date(todo.dueAt).getTime() < end) groups.today.push(todo);
    else groups.upcoming.push(todo);
  }
  const compare = (a: TodoRecord, b: TodoRecord): number =>
    Number(b.isImportant) - Number(a.isImportant) ||
    (a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER) -
      (b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  Object.values(groups).forEach((items) => items.sort(compare));
  return groups;
}
