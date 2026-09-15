import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import { api } from '@/api';
import { TODO_DATA_CHANGED_EVENT } from '@/lib/todo-events';
import type { TodoSummary } from '@shared/types';

interface TodoContextValue {
  summary: TodoSummary;
  refresh: () => Promise<void>;
}
const EMPTY_SUMMARY: TodoSummary = {
  overdueCount: 0,
  todayCount: 0,
  incompleteCount: 0,
  items: [],
};

const TodoContext = createContext<TodoContextValue>({
  summary: EMPTY_SUMMARY,
  refresh: async () => undefined,
});

export function TodoProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<TodoSummary>(EMPTY_SUMMARY);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next: TodoSummary = await api.getTodoSummary();
      setSummary(next);
      const now: number = Date.now();
      for (const item of next.items) {
        if (!item.reminderAt || new Date(item.reminderAt).getTime() > now) continue;
        const key: string = `qz-todo-reminded:${item.id}:${item.reminderAt}`;
        if (window.sessionStorage.getItem(key)) continue;
        window.sessionStorage.setItem(key, '1');
        toast(`待办提醒：${item.title}`, {
          description: item.application
            ? `${item.application.company} · ${item.application.position}`
            : '求职待办',
        });
      }
    } catch {
      // 登录恢复或页面切换期间允许静默重试，不阻断原有页面。
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handleChange = (): void => void refresh();
    window.addEventListener(TODO_DATA_CHANGED_EVENT, handleChange);
    const timer: number = window.setInterval(handleChange, 60_000);
    return () => {
      window.removeEventListener(TODO_DATA_CHANGED_EVENT, handleChange);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const value: TodoContextValue = useMemo(
    () => ({ summary, refresh }),
    [refresh, summary],
  );
  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodoSummary(): TodoContextValue {
  return useContext(TodoContext);
}
