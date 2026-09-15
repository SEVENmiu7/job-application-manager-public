import { useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { api } from '@/api';
import { PageHeader } from '@/components/page-ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type {
  DeleteMyDataResponse,
  InterviewReviewNextAction,
  InterviewReviewQuestion,
  UserApplicationExport,
  UserDataExport,
  UserInterviewReviewExport,
  UserTodoExport,
} from '@shared/api.interface';

import { safeSpreadsheetText } from './privacy-export';

type FeedbackTone = 'success' | 'error';

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

interface ExportRow {
  [key: string]: string | number;
}

const DELETE_CONFIRMATION = '删除全部数据';

export default function PrivacySettings() {
  const [exportingType, setExportingType] = useState<'excel' | 'json' | null>(
    null,
  );
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [confirmation, setConfirmation] = useState<string>('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleExportJson = async (): Promise<void> => {
    setExportingType('json');
    setFeedback(null);
    try {
      const data: UserDataExport = await api.exportMyData();
      const content: string = JSON.stringify(data, null, 2);
      downloadBlob(
        new Blob([content], { type: 'application/json;charset=utf-8' }),
        `求职投递数据备份-${getChinaDate()}.json`,
      );
      setFeedback({ tone: 'success', message: '完整 JSON 备份已下载。' });
    } catch (caughtError: unknown) {
      const message: string = getErrorMessage(caughtError, '导出失败');
      logger.error('导出个人 JSON 数据失败');
      setFeedback({ tone: 'error', message });
    } finally {
      setExportingType(null);
    }
  };

  const handleExportExcel = async (): Promise<void> => {
    setExportingType('excel');
    setFeedback(null);
    try {
      const data: UserDataExport = await api.exportMyData();
      const XLSX: typeof import('xlsx') = await import('xlsx');
      const workbook: import('xlsx').WorkBook = XLSX.utils.book_new();
      const applicationRows: ExportRow[] = data.applications.map(
        (application: UserApplicationExport): ExportRow =>
          toApplicationRow(application),
      );
      const applicationNames: Map<string, string> = new Map(
        data.applications.map(
          (application: UserApplicationExport): [string, string] => [
            application.id,
            `${application.company}｜${application.position}`,
          ],
        ),
      );
      const reviewRows: ExportRow[] = data.interviewReviews.map(
        (review: UserInterviewReviewExport): ExportRow =>
          toReviewRow(review, applicationNames),
      );
      const todoRows: ExportRow[] = data.todos.map(
        (todo: UserTodoExport): ExportRow =>
          toTodoRow(todo, applicationNames),
      );
      const applicationSheet: import('xlsx').WorkSheet =
        XLSX.utils.json_to_sheet(applicationRows);
      const reviewSheet: import('xlsx').WorkSheet =
        XLSX.utils.json_to_sheet(reviewRows);
      const todoSheet: import('xlsx').WorkSheet =
        XLSX.utils.json_to_sheet(todoRows);
      applicationSheet['!cols'] = APPLICATION_COLUMN_WIDTHS.map(
        (wch: number) => ({ wch }),
      );
      reviewSheet['!cols'] = REVIEW_COLUMN_WIDTHS.map((wch: number) => ({
        wch,
      }));
      todoSheet['!cols'] = TODO_COLUMN_WIDTHS.map((wch: number) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, applicationSheet, '投递记录');
      XLSX.utils.book_append_sheet(workbook, reviewSheet, '面试复盘');
      XLSX.utils.book_append_sheet(workbook, todoSheet, '求职待办');
      XLSX.writeFile(workbook, `求职投递记录-${getChinaDate()}.xlsx`);
      setFeedback({ tone: 'success', message: 'Excel 文件已下载。' });
    } catch (caughtError: unknown) {
      const message: string = getErrorMessage(caughtError, '导出失败');
      logger.error('导出个人 Excel 数据失败');
      setFeedback({ tone: 'error', message });
    } finally {
      setExportingType(null);
    }
  };

  const handleDeleteAll = async (): Promise<void> => {
    if (confirmation !== DELETE_CONFIRMATION) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const result: DeleteMyDataResponse = await api.deleteMyData();
      setDeleteDialogOpen(false);
      setConfirmation('');
      setFeedback({
        tone: 'success',
        message:
          `已删除 ${result.deletedApplications} 条投递记录、` +
          `${result.deletedInterviewReviews} 条面试复盘和 ` +
          `${result.deletedTodos} 条求职待办。`,
      });
    } catch (caughtError: unknown) {
      const message: string = getErrorMessage(caughtError, '删除失败');
      logger.error('删除当前用户全部数据失败');
      setFeedback({ tone: 'error', message });
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogChange = (open: boolean): void => {
    setDeleteDialogOpen(open);
    if (!open && !deleting) setConfirmation('');
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader
        eyebrow="PRIVACY & DATA"
        title="数据与隐私"
        description="管理个人数据副本，并随时清除当前账号保存的全部记录。"
        leading={
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck className="size-5" />
          </span>
        }
      />

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden bg-surface-elevated/80">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <LockKeyhole className="size-5" />
              </span>
              <div>
                <CardTitle className="text-lg">你的数据如何保存</CardTitle>
                <CardDescription className="mt-1 leading-6">
                  记录保存在本应用的独立数据库中，并与当前登录账号关联。
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-foreground-secondary">
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                普通用户只能查看和修改自己的记录，不能访问其他账号的数据。
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                应用维护人员可能因故障排查和系统维护接触托管数据。
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                请勿填写身份证号、银行卡号等高度敏感信息。
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated/80">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Download className="size-5" />
              </span>
              <div>
                <CardTitle className="text-lg">导出我的数据</CardTitle>
                <CardDescription className="mt-1 leading-6">
                  下载内容仅包含当前登录账号的投递记录、面试复盘和求职待办。
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingType !== null}
            >
              <FileSpreadsheet />
              {exportingType === 'excel' ? '正在生成…' : '导出 Excel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportJson}
              disabled={exportingType !== null}
            >
              <FileJson />
              {exportingType === 'json' ? '正在生成…' : '导出完整 JSON 备份'}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="border-red-200 bg-red-50/70">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 className="size-5" />
              </span>
              <div>
                <CardTitle className="text-lg text-red-900">
                  删除我的全部数据
                </CardTitle>
                <CardDescription className="mt-1 max-w-2xl leading-6 text-red-700/80">
                  删除当前账号的全部投递、面试复盘和求职待办。操作完成后无法恢复，建议先导出备份。
                </CardDescription>
              </div>
            </div>
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={handleDialogChange}
            >
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 />
                  删除全部数据
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定删除全部个人数据？</AlertDialogTitle>
                  <AlertDialogDescription className="leading-6">
                    所有投递记录、面试复盘和求职待办都会永久删除。请输入“
                    {DELETE_CONFIRMATION}”确认操作。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={DELETE_CONFIRMATION}
                  aria-label="删除确认文字"
                  autoComplete="off"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    取消
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        confirmation !== DELETE_CONFIRMATION || deleting
                      }
                      onClick={handleDeleteAll}
                    >
                      {deleting ? '正在删除…' : '永久删除'}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

const APPLICATION_COLUMN_WIDTHS: number[] = [
  38, 20, 24, 20, 16, 20, 16, 20, 20, 16, 24, 32, 20, 18, 14, 12, 12, 36,
  36, 42, 42, 20, 20, 48,
];
const REVIEW_COLUMN_WIDTHS: number[] = [
  38, 30, 14, 20, 12, 20, 12, 36, 48, 36, 36, 36, 42, 20, 20,
];
const TODO_COLUMN_WIDTHS: number[] = [
  38, 30, 40, 42, 20, 20, 12, 12, 12, 20, 20, 20,
];

function toApplicationRow(application: UserApplicationExport): ExportRow {
  return {
    记录编号: application.id,
    公司名称: safeSpreadsheetText(application.company),
    岗位名称: safeSpreadsheetText(application.position),
    工作地区: joinText(application.locations),
    所属行业: safeSpreadsheetText(application.industry),
    职能方向: joinText(application.functionDirections),
    招聘渠道: safeSpreadsheetText(application.channel),
    收藏时间: formatDateTime(application.favoriteTime),
    投递时间: formatDateTime(application.applyTime),
    当前进度: safeSpreadsheetText(application.status),
    下一步安排: safeSpreadsheetText(application.nextStep),
    个人备注: safeSpreadsheetText(application.notes),
    简历标识: safeSpreadsheetText(application.resumeTag),
    薪资: safeSpreadsheetText(application.salary),
    工作方式: formatWorkMode(application.workMode),
    能力匹配: formatDecisionLevel(application.fitLevel),
    主观意愿: formatDecisionLevel(application.interestLevel),
    岗位亮点: safeSpreadsheetText(application.jobHighlights),
    主要顾虑: safeSpreadsheetText(application.jobConcerns),
    岗位职责: safeSpreadsheetText(application.jobResponsibilities),
    任职要求: safeSpreadsheetText(application.jobRequirements),
    创建时间: formatDateTime(application.createdAt),
    更新时间: formatDateTime(application.updatedAt),
    流程时间: safeSpreadsheetText(
      JSON.stringify(application.processTimes, null, 2),
    ),
  };
}

function formatWorkMode(value?: UserApplicationExport['workMode']): string {
  const labels: Record<NonNullable<UserApplicationExport['workMode']>, string> = {
    onsite: '现场办公',
    hybrid: '混合办公',
    remote: '远程办公',
  };
  return value ? labels[value] : '';
}

function formatDecisionLevel(
  value?: UserApplicationExport['fitLevel'],
): string {
  const labels: Record<NonNullable<UserApplicationExport['fitLevel']>, string> = {
    1: '低',
    2: '中',
    3: '高',
  };
  return value ? labels[value] : '';
}

function toReviewRow(
  review: UserInterviewReviewExport,
  applicationNames: Map<string, string>,
): ExportRow {
  const applicationName: string =
    applicationNames.get(review.applicationId) || review.applicationId;
  return {
    复盘编号: review.id,
    对应投递: safeSpreadsheetText(applicationName),
    面试轮次: safeSpreadsheetText(review.stage),
    面试时间: formatDateTime(review.interviewTime),
    面试形式: safeSpreadsheetText(review.format),
    面试官或部门: safeSpreadsheetText(review.interviewer),
    整体感受: review.overallFeeling || '',
    原始速记: safeSpreadsheetText(review.rawNotes),
    问题与回答: formatQuestions(review.questions),
    做得好的地方: safeSpreadsheetText(review.wentWell),
    需要改进的地方: safeSpreadsheetText(review.improvements),
    公司与团队信号: safeSpreadsheetText(review.companySignals),
    下一步行动: formatNextActions(review.nextActions),
    创建时间: formatDateTime(review.createdAt),
    更新时间: formatDateTime(review.updatedAt),
  };
}

function toTodoRow(
  todo: UserTodoExport,
  applicationNames: Map<string, string>,
): ExportRow {
  const applicationName: string = todo.applicationId
    ? applicationNames.get(todo.applicationId) || todo.applicationId
    : '';
  return {
    待办编号: todo.id,
    关联岗位: safeSpreadsheetText(applicationName),
    待办内容: safeSpreadsheetText(todo.title),
    备注: safeSpreadsheetText(todo.notes),
    截止时间: formatDateTime(todo.dueAt),
    提醒时间: formatDateTime(todo.reminderAt),
    时间精度: todo.duePrecision === 'date' ? '按日期' : '按小时',
    重要: todo.isImportant ? '是' : '否',
    排序: todo.sortOrder,
    完成时间: formatDateTime(todo.completedAt),
    创建时间: formatDateTime(todo.createdAt),
    更新时间: formatDateTime(todo.updatedAt),
  };
}

function formatQuestions(questions: InterviewReviewQuestion[]): string {
  return safeSpreadsheetText(
    questions
      .map(
        (question: InterviewReviewQuestion, index: number) =>
          `${index + 1}. ${question.question}\n我的回答：${question.myAnswer}\n暴露的问题：${question.problem}\n更好的思路：${question.betterApproach}`,
      )
      .join('\n\n'),
  );
}

function formatNextActions(actions: InterviewReviewNextAction[]): string {
  return safeSpreadsheetText(
    actions
      .map(
        (action: InterviewReviewNextAction) =>
          `${action.done ? '已完成' : '待完成'}｜${action.content}${
            action.dueTime ? `｜${formatDateTime(action.dueTime)}` : ''
          }`,
      )
      .join('\n'),
  );
}

function joinText(values: string[]): string {
  return safeSpreadsheetText(values.join('、'));
}

function formatDateTime(value?: string): string {
  if (!value) return '';
  const date: Date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeSpreadsheetText(value);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
}

function getChinaDate(): string {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Shanghai',
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
