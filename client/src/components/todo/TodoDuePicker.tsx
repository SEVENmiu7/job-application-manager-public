import { CalendarClock, Clock3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  chinaDateKey,
  formatTodoDue,
  nextSaturdayKey,
  scheduleToPayload,
  type TodoReminderMode,
  type TodoScheduleValue,
} from './todo-time';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function TodoDuePicker({
  value,
  onChange,
  compact = false,
}: {
  value: TodoScheduleValue;
  onChange: (value: TodoScheduleValue) => void;
  compact?: boolean;
}) {
  const payload = scheduleToPayload(value);
  const selected = value.date ? new Date(`${value.date}T00:00:00`) : undefined;
  const setDate = (date: string, hour = value.hour): void => onChange({ ...value, date, hour });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={cn('justify-start font-normal', compact ? 'h-9 min-w-0 flex-1 px-2.5 text-xs' : 'min-w-[180px]')}>
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <span className="truncate">{formatTodoDue(payload.dueAt, value.precision)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className="w-[min(94vw,360px)] space-y-3 rounded-2xl p-3 shadow-xl">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            ['', '无日期'],
            [chinaDateKey(), '今天'],
            [chinaDateKey(1), '明天'],
            [nextSaturdayKey(), '周末'],
          ].map(([date, label]) => (
            <Button key={label} type="button" size="sm" variant={value.date === date ? 'secondary' : 'ghost'} onClick={() => setDate(date)}>{label}</Button>
          ))}
        </div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && setDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)}
          disabled={{ before: new Date(`${chinaDateKey()}T00:00:00`) }}
          className="mx-auto"
        />
        {value.date && (
          <>
            <div className="grid grid-cols-2 rounded-xl bg-muted p-1" aria-label="截止时间精度">
              <Button type="button" size="sm" variant={value.precision === 'date' ? 'secondary' : 'ghost'} onClick={() => onChange({ ...value, precision: 'date' })}>仅日期</Button>
              <Button type="button" size="sm" variant={value.precision === 'hour' ? 'secondary' : 'ghost'} onClick={() => onChange({ ...value, precision: 'hour' })}>指定时间</Button>
            </div>
            {value.precision === 'hour' && (
              <Select value={String(value.hour)} onValueChange={(hour) => onChange({ ...value, hour: Number(hour) })}>
                <SelectTrigger className="w-full"><Clock3 className="size-4" /><SelectValue /></SelectTrigger>
                <SelectContent>{HOURS.map((hour) => <SelectItem key={hour} value={String(hour)}>{hour} 时</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={value.reminderMode} onValueChange={(mode) => onChange({ ...value, reminderMode: mode as TodoReminderMode })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认提醒（{value.precision === 'date' ? '当天 9 时' : '截止时'}）</SelectItem>
                <SelectItem value="none">不提醒</SelectItem>
                <SelectItem value="hour-before">提前 1 小时</SelectItem>
                <SelectItem value="day-before">前一天</SelectItem>
                <SelectItem value="custom">自定义整点</SelectItem>
              </SelectContent>
            </Select>
            {value.reminderMode === 'custom' && (
              <Select value={String(value.customReminderHour)} onValueChange={(hour) => onChange({ ...value, customReminderHour: Number(hour) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{HOURS.map((hour) => <SelectItem key={hour} value={String(hour)}>当天 {hour} 时提醒</SelectItem>)}</SelectContent>
              </Select>
            )}
            <p className="px-1 text-xs text-muted-foreground">仅在应用内提醒；时间统一显示到整点。</p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
