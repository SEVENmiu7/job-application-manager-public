import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { createStoredState, parseStoredState } from '@/lib/persistent-state';

interface PersistentStateResult<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  clearValue: () => void;
  hasStoredValue: boolean;
  savedAt: number | null;
}

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  retentionMs: number,
): PersistentStateResult<T> {
  const [initialState] = useState(() => {
    try {
      return parseStoredState<T>(window.localStorage.getItem(key), Date.now());
    } catch (error: unknown) {
      logger.warn(
        JSON.stringify({
          message: '读取本机草稿失败',
          key,
          error: error instanceof Error ? error.message : '未知错误',
        }),
      );
      return null;
    }
  });
  const [value, setValue] = useState<T>(initialState?.value ?? initialValue);
  const [savedAt, setSavedAt] = useState<number | null>(
    initialState?.savedAt ?? null,
  );
  useEffect(() => {
    if (value === null) {
      try {
        window.localStorage.removeItem(key);
        setSavedAt(null);
      } catch (error: unknown) {
        logger.warn(
          JSON.stringify({
            message: '清除本机草稿失败',
            key,
            error: error instanceof Error ? error.message : '未知错误',
          }),
        );
      }
      return;
    }

    const nextSavedAt: number = Date.now();
    const storedState = createStoredState(value, nextSavedAt, retentionMs);
    try {
      window.localStorage.setItem(key, JSON.stringify(storedState));
      setSavedAt(nextSavedAt);
    } catch (error: unknown) {
      logger.warn(
        JSON.stringify({
          message: '保存本机草稿失败',
          key,
          error: error instanceof Error ? error.message : '未知错误',
        }),
      );
    }
  }, [key, retentionMs, value]);

  const clearValue = useCallback((): void => {
    try {
      window.localStorage.removeItem(key);
      setSavedAt(null);
    } catch (error: unknown) {
      logger.warn(
        JSON.stringify({
          message: '清除本机草稿失败',
          key,
          error: error instanceof Error ? error.message : '未知错误',
        }),
      );
    }
  }, [key]);

  return {
    value,
    setValue,
    clearValue,
    hasStoredValue: Boolean(initialState),
    savedAt,
  };
}
