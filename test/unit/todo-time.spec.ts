import {
  formatTodoDue,
  scheduleFromRecord,
  scheduleToPayload,
  type TodoScheduleValue,
} from '@/components/todo/todo-time';
import { getChinaDayRange } from '@server/modules/todo/todo-time';

describe('getChinaDayRange', () => {
  it('uses China Standard Time across the UTC date boundary', () => {
    const range = getChinaDayRange(new Date('2026-09-14T16:30:00.000Z'));
    expect(range.start.toISOString()).toBe('2026-09-14T16:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-09-15T15:59:59.999Z');
  });

  it('keeps the same China day before midnight', () => {
    const range = getChinaDayRange(new Date('2026-09-14T03:00:00.000Z'));
    expect(range.start.toISOString()).toBe('2026-09-13T16:00:00.000Z');
    expect(range.end.getTime() - range.start.getTime()).toBe(86_399_999);
  });
});
describe('待办时间精度', () => {
  const base: TodoScheduleValue = {
    date: '2026-09-20',
    hour: 18,
    precision: 'hour',
    reminderMode: 'default',
    customReminderHour: 9,
  };

  it('整点任务不生成分钟和秒', () => {
    expect(scheduleToPayload(base)).toEqual({
      dueAt: '2026-09-20 18:00:00',
      reminderAt: '2026-09-20T10:00:00.000Z',
      duePrecision: 'hour',
    });
  });

  it('仅日期任务在当天结束后逾期，并默认当天 9 时提醒', () => {
    expect(scheduleToPayload({ ...base, precision: 'date' })).toEqual({
      dueAt: '2026-09-20 23:59:59',
      reminderAt: '2026-09-20T01:00:00.000Z',
      duePrecision: 'date',
    });
  });

  it('关闭提醒时保留截止日期', () => {
    expect(scheduleToPayload({ ...base, reminderMode: 'none' }).reminderAt).toBeNull();
  });

  it('读取旧数据时默认兼容为整点精度', () => {
    const value = scheduleFromRecord('2026-09-20T10:34:00.000Z', null, 'hour');
    expect(value.date).toBe('2026-09-20');
    expect(value.hour).toBe(18);
    expect(formatTodoDue('2026-09-20T10:34:00.000Z', 'hour')).toContain('18 时截止');
  });
});
