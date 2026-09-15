import type { TodoDuePrecision } from '@shared/types';

export type TodoReminderMode = 'default' | 'none' | 'hour-before' | 'day-before' | 'custom';

export interface TodoScheduleValue {
  date: string;
  hour: number;
  precision: TodoDuePrecision;
  reminderMode: TodoReminderMode;
  customReminderHour: number;
}
const pad = (value: number): string => String(value).padStart(2, '0');

export function chinaDateKey(offsetDays = 0): string {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function nextSaturdayKey(): string {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const days = shifted.getUTCDay() === 6 ? 7 : (6 - shifted.getUTCDay() + 7) % 7;
  return chinaDateKey(days);
}

export function scheduleToPayload(value: TodoScheduleValue): {
  dueAt: string | null;
  reminderAt: string | null;
  duePrecision: TodoDuePrecision;
} {
  if (!value.date) return { dueAt: null, reminderAt: null, duePrecision: value.precision };
  const dueHour = value.precision === 'date' ? 23 : value.hour;
  const dueAt = `${value.date} ${pad(dueHour)}:${value.precision === 'date' ? '59:59' : '00:00'}`;
  if (value.reminderMode === 'none') return { dueAt, reminderAt: null, duePrecision: value.precision };
  const due = new Date(`${value.date}T${pad(dueHour)}:${value.precision === 'date' ? '59:59' : '00:00'}+08:00`);
  let reminder = new Date(due);
  if (value.reminderMode === 'default') {
    reminder = new Date(`${value.date}T${pad(value.precision === 'date' ? 9 : value.hour)}:00:00+08:00`);
  } else if (value.reminderMode === 'hour-before') {
    reminder.setHours(reminder.getHours() - 1);
  } else if (value.reminderMode === 'day-before') {
    reminder.setDate(reminder.getDate() - 1);
  } else {
    reminder = new Date(`${value.date}T${pad(value.customReminderHour)}:00:00+08:00`);
  }
  return { dueAt, reminderAt: reminder.toISOString(), duePrecision: value.precision };
}

export function scheduleFromRecord(
  dueAt?: string | null,
  reminderAt?: string | null,
  precision: TodoDuePrecision = 'hour',
): TodoScheduleValue {
  if (!dueAt) return { date: '', hour: 18, precision, reminderMode: 'default', customReminderHour: 9 };
  const due = chinaParts(dueAt);
  const base: TodoScheduleValue = {
    date: due.date,
    hour: precision === 'date' ? 18 : due.hour,
    precision,
    reminderMode: 'default',
    customReminderHour: 9,
  };
  if (!reminderAt) return { ...base, reminderMode: 'none' };
  const payload = scheduleToPayload(base);
  const reminderTime = new Date(reminderAt).getTime();
  if (payload.reminderAt && new Date(payload.reminderAt).getTime() === reminderTime) return base;
  const dueTime = new Date(dueAt).getTime();
  if (dueTime - reminderTime === 60 * 60 * 1000) return { ...base, reminderMode: 'hour-before' };
  if (dueTime - reminderTime >= 23 * 60 * 60 * 1000 && dueTime - reminderTime <= 25 * 60 * 60 * 1000) return { ...base, reminderMode: 'day-before' };
  const reminder = chinaParts(reminderAt);
  return { ...base, reminderMode: 'custom', customReminderHour: reminder.hour };
}

export function formatTodoDue(dueAt?: string | null, precision: TodoDuePrecision = 'hour'): string {
  if (!dueAt) return '无截止日期';
  const parts = chinaParts(dueAt);
  const [year, month, day] = parts.date.split('-').map(Number);
  const currentYear = Number(chinaDateKey().slice(0, 4));
  return `${year === currentYear ? '' : `${year} 年 `}${month} 月 ${day} 日${precision === 'hour' ? ` ${parts.hour} 时` : ''}截止`;
}

function chinaParts(value: string): { date: string; hour: number } {
  const shifted = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    hour: shifted.getUTCHours(),
  };
}
