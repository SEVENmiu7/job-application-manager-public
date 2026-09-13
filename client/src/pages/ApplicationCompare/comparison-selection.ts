export const MAX_COMPARE_JOBS = 3;

export function normalizeCompareIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(
    0,
    MAX_COMPARE_JOBS,
  );
}

export function toggleCompareId(
  current: string[],
  id: string,
): { ids: string[]; limitReached: boolean } {
  const normalized = normalizeCompareIds(current);
  if (normalized.includes(id)) {
    return {
      ids: normalized.filter((item) => item !== id),
      limitReached: false,
    };
  }
  if (normalized.length >= MAX_COMPARE_JOBS) {
    return { ids: normalized, limitReached: true };
  }
  return { ids: [...normalized, id], limitReached: false };
}
