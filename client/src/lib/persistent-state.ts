interface StoredState<T> {
  value: T;
  savedAt: number;
  expiresAt: number;
}

export function parseStoredState<T>(
  rawValue: string | null,
  now: number,
): { value: T; savedAt: number } | null {
  if (!rawValue) return null;
  const parsed: unknown = JSON.parse(rawValue);
  if (!parsed || typeof parsed !== 'object') return null;

  const record = parsed as Partial<StoredState<T>>;
  if (
    typeof record.savedAt !== 'number' ||
    typeof record.expiresAt !== 'number' ||
    record.expiresAt <= now ||
    !('value' in record)
  ) {
    return null;
  }
  return { value: record.value as T, savedAt: record.savedAt };
}

export function createStoredState<T>(
  value: T,
  savedAt: number,
  retentionMs: number,
): StoredState<T> {
  return {
    value,
    savedAt,
    expiresAt: savedAt + retentionMs,
  };
}
