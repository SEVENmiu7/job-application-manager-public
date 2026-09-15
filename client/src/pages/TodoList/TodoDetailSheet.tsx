import { useEffect, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApplicationSearchPicker } from '@/components/application/ApplicationSearchPicker';
import { TodoDuePicker } from '@/components/todo/TodoDuePicker';
import { scheduleFromRecord, scheduleToPayload, type TodoScheduleValue } from '@/components/todo/todo-time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ApplicationRecord, TodoRecord, TodoSaveInput } from '@shared/types';

export function TodoDetailSheet({ todo, applications, onClose, onUpdate, onRemove }: {
  todo: TodoRecord | null;
  applications: ApplicationRecord[];
  onClose: () => void;
  onUpdate: (todo: TodoRecord, changes: Partial<TodoSaveInput>) => Promise<void>;
  onRemove: (todo: TodoRecord) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TodoRecord | null>(todo);
  const [schedule, setSchedule] = useState<TodoScheduleValue>(() => scheduleFromRecord(todo?.dueAt, todo?.reminderAt, todo?.duePrecision));
  useEffect(() => {
    setDraft(todo);
    setSchedule(scheduleFromRecord(todo?.dueAt, todo?.reminderAt, todo?.duePrecision));
  }, [todo]);
  if (!draft) return <Sheet open={false} />;
  return (
    <Sheet open={Boolean(todo)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[94vw] gap-0 bg-surface-floating p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b border-border px-6 pb-4 pt-6 pr-12 text-left">
          <SheetTitle>待办详情</SheetTitle>
          <SheetDescription>调整截止日期、整点提醒和岗位关联</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <label className="space-y-2 text-sm font-semibold text-foreground">待办内容
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm font-semibold text-foreground">备注
            <Textarea rows={5} value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="补充准备材料、联系人或注意事项" />
          </label>
          <div className="space-y-2 text-sm font-semibold text-foreground">截止与提醒
            <TodoDuePicker value={schedule} onChange={setSchedule} />
          </div>
          <div className="space-y-2 text-sm font-semibold text-foreground">关联岗位
            <ApplicationSearchPicker records={applications} value={draft.applicationId} contentMode="contained" allowClear onSelect={(id) => setDraft({ ...draft, applicationId: id })} onClear={() => setDraft({ ...draft, applicationId: null })} />
          </div>
          <Button type="button" variant={draft.isImportant ? 'secondary' : 'outline'} className={cn('w-full justify-start', draft.isImportant && 'text-amber-600')} onClick={() => setDraft({ ...draft, isImportant: !draft.isImportant })}>
            <Star className={cn('size-4', draft.isImportant && 'fill-current')} />{draft.isImportant ? '已标记为重要' : '标记为重要'}
          </Button>
        </div>
        <div className="flex gap-2 border-t border-border p-5">
          <Button variant="destructive" onClick={() => void onRemove(draft)}><Trash2 />删除</Button>
          <Button className="ml-auto" onClick={async () => {
            await onUpdate(todo!, { title: draft.title, notes: draft.notes || '', applicationId: draft.applicationId || null, isImportant: draft.isImportant, ...scheduleToPayload(schedule) });
            onClose();
            toast.success('待办已保存');
          }}>保存修改</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
