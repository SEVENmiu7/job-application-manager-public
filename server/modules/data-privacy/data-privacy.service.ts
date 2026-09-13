import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { count, desc, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { applications, interviewReviews } from '@server/database/schema';
import type {
  InterviewReviewNextAction,
  InterviewReviewQuestion,
  UserApplicationExport,
  UserDataExport,
  UserInterviewReviewExport,
  DeleteMyDataResponse,
} from '@shared/api.interface';
import {
  PROCESS_TIME_STAGES,
  type ApplicationProcessTimes,
  type DecisionLevel,
  type WorkMode,
} from '@shared/types';
import { serializeStoredTimestamp } from '@server/modules/application/application-time';

type ApplicationRow = typeof applications.$inferSelect;
type ReviewRow = typeof interviewReviews.$inferSelect;

@Injectable()
export class DataPrivacyService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async exportMyData(userId: string): Promise<UserDataExport> {
    const applicationRows: ApplicationRow[] = await this.db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.updatedAt));
    const reviewRows: ReviewRow[] = await this.db
      .select()
      .from(interviewReviews)
      .where(eq(interviewReviews.userId, userId))
      .orderBy(desc(interviewReviews.updatedAt));

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      applications: applicationRows.map(
        (row: ApplicationRow): UserApplicationExport =>
          this.serializeApplication(row),
      ),
      interviewReviews: reviewRows.map(
        (row: ReviewRow): UserInterviewReviewExport =>
          this.serializeReview(row),
      ),
    };
  }

  async deleteMyData(userId: string): Promise<DeleteMyDataResponse> {
    const reviewCountRows: { total: number }[] = await this.db
      .select({ total: count() })
      .from(interviewReviews)
      .where(eq(interviewReviews.userId, userId));
    const deletedApplications: { id: string }[] = await this.db
      .delete(applications)
      .where(eq(applications.userId, userId))
      .returning({ id: applications.id });

    return {
      deletedApplications: deletedApplications.length,
      deletedInterviewReviews: Number(reviewCountRows[0]?.total) || 0,
    };
  }

  private serializeApplication(row: ApplicationRow): UserApplicationExport {
    return {
      id: row.id,
      company: row.company,
      position: row.position,
      locations: this.parseStringArray(row.location),
      industry: row.industry || undefined,
      functionDirections: this.parseStringArray(row.functions),
      channel: row.channel || undefined,
      favoriteTime: serializeStoredTimestamp(row.favoriteTime),
      applyTime: serializeStoredTimestamp(row.applyTime),
      processTimes: this.parseProcessTimes(row.processTimes),
      status: row.status || '收藏',
      nextStep: row.nextStep || undefined,
      notes: row.notes || undefined,
      resumeTag: row.resumeTag || undefined,
      jobResponsibilities: row.jobResponsibilities || undefined,
      jobRequirements: row.jobRequirements || undefined,
      salary: row.salary || undefined,
      workMode: this.parseWorkMode(row.workMode),
      fitLevel: this.parseDecisionLevel(row.fitLevel),
      interestLevel: this.parseDecisionLevel(row.interestLevel),
      jobHighlights: row.jobHighlights || undefined,
      jobConcerns: row.jobConcerns || undefined,
      createdAt: serializeStoredTimestamp(row.createdAt) || '',
      updatedAt: serializeStoredTimestamp(row.updatedAt) || '',
    };
  }

  private serializeReview(row: ReviewRow): UserInterviewReviewExport {
    return {
      id: row.id,
      applicationId: row.applicationId,
      stage: row.stage,
      interviewTime: serializeStoredTimestamp(row.interviewTime),
      format: row.format || undefined,
      interviewer: row.interviewer || undefined,
      overallFeeling: row.overallFeeling ?? undefined,
      rawNotes: row.rawNotes || undefined,
      questions: this.parseJsonArray<InterviewReviewQuestion>(row.questions),
      wentWell: row.wentWell || undefined,
      improvements: row.improvements || undefined,
      companySignals: row.companySignals || undefined,
      nextActions: this.parseJsonArray<InterviewReviewNextAction>(
        row.nextActions,
      ),
      createdAt: serializeStoredTimestamp(row.createdAt) || '',
      updatedAt: serializeStoredTimestamp(row.updatedAt) || '',
    };
  }

  private parseStringArray(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(
            (item: unknown): item is string => typeof item === 'string',
          )
        : [];
    } catch {
      return value
        .split(/[,，、;/；]/)
        .map((item: string) => item.trim())
        .filter(Boolean);
    }
  }

  private parseProcessTimes(value: string | null): ApplicationProcessTimes {
    if (!value) return {};
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      const source: Record<string, unknown> = parsed as Record<string, unknown>;
      const result: ApplicationProcessTimes = {};
      for (const stage of PROCESS_TIME_STAGES) {
        const timestamp: unknown = source[stage];
        if (typeof timestamp === 'string' && timestamp) {
          result[stage] = timestamp;
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  private parseWorkMode(value: string | null): WorkMode | undefined {
    return value === 'onsite' || value === 'hybrid' || value === 'remote'
      ? value
      : undefined;
  }

  private parseDecisionLevel(value: number | null): DecisionLevel | undefined {
    return value === 1 || value === 2 || value === 3 ? value : undefined;
  }

  private parseJsonArray<T>(value: unknown): T[] {
    if (!value) return [];
    let parsed: unknown = value;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return [];
      }
    }
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  }
}
