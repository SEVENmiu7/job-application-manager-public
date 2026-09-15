import { useEffect, useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api';
import { ApplicationSearchPicker } from '@/components/application/ApplicationSearchPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ApplicationRecord, TodoRecord, TodoSaveInput } from '@shared/types';
import { TodoDuePicker } from './TodoDuePicker';
import { scheduleToPayload, type TodoScheduleValue } from './todo-time';

const DEFAULT_SCHEDULE: TodoScheduleValue = {
  date: '',
  hour: 18,
  precision: 'hour',
  reminderMode: 'default',
  customReminderHour: 9,
};

export function TodoComposer({
  applications,
  initialTitle = '',
  initialApplicationId = '',
  compact = false,
  autoFocus = false,
  onCreated,
}: {
  applications: ApplicationRecord[];
  initialTitle?: string;
  initialApplicationId?: string;
  compact?: boolean;
  autoFocus?: boolean;
  onCreated?: (todo: TodoRecord) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [applicationId, setApplicationId] = useState(initialApplicationId);
  const [important, setImportant] = useState(false);
  const [schedule, setSchedule] = useState<TodoScheduleValue>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setApplicationId(initialApplicationId);
    setAllowDuplicate(false);
  }, [initialApplicationId, initialTitle]);

  const save = async (forceDuplicate = false): Promise<void> => {
    if (!title.trim()) return;
    setSaving(true);
    const timing = scheduleToPayload(schedule);
    const input: TodoSaveInput = {
      title: title.trim(),
      applicationId: applicationId || null,
      isImportant: important,
      ...timing,
      allowDuplicate: forceDuplicate,
    };
    try {
      const todo = await api.createTodo(input);
      setTitle('');
      setApplicationId('');
      setImportant(false);
      setSchedule((current) => ({ ...DEFAULT_SCHEDULE, precision: current.precision }));
      setAllowDuplicate(false);
      toast.success('待办已添加');
      onCreated?.(todo);
    } catch (error) {
      const message = error instanceof Error ? error.message : '添加失败';
      setAllowDuplicate(message.includes('同名未完成'));
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className={cn('todo-composer', compact && 'todo-composer-compact')}
      onSubmit={(event) => { event.preventDefault(); void save(false); }}
    >
      <div className="todo-composer-title-row">
        <div className="relative min-w-0 flex-1">
          <Plus className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <Input
            autoFocus={autoFocus}
            className={cn('pl-10', !compact && 'h-11')}
            value={title}
            onChange={(event) => { setTitle(event.target.value); setAllowDuplicate(false); }}
            placeholder="例如：准备华勤一面"
            aria-label="待办内容"
          />
        </div>
        <Button
          type="button"
          variant={important ? 'secondary' : 'outline'}
          size={compact ? 'icon' : 'default'}
          className={cn(important && 'text-amber-600')}
          aria-pressed={important}
          aria-label={important ? '取消重要标记' : '标记为重要'}
          onClick={() => setImportant((value) => !value)}
        >
          <Star className={cn('size-4', important && 'fill-current')} />
          {!compact && <span>重要</span>}
        </Button>
        <Button type="submit" disabled={saving || !title.trim()}>{compact ? <Plus className="size-4" /> : '添加'}</Button>
      </div>
      <div className="todo-composer-settings-row">
        <TodoDuePicker value={schedule} onChange={setSchedule} compact={compact} />
        <ApplicationSearchPicker
          records={applications}
          value={applicationId}
          placeholder="关联岗位（可搜索）"
          className="min-w-0 flex-1"
          contentMode={compact ? 'contained' : 'standard'}
          allowClear
          onSelect={setApplicationId}
          onClear={() => setApplicationId('')}
        />
      </div>
      {allowDuplicate && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <span>已有同名未完成待办。</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void save(true)}>仍然创建</Button>
        </div>
      )}
    </form>
  );
}
