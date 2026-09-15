const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface TodoDayRange {
  start: Date;
  end: Date;
}
/** 以中国标准时间计算自然日，避免服务端部署时区改变筛选结果。 */
export function getChinaDayRange(now: Date = new Date()): TodoDayRange {
  const chinaNow: Date = new Date(now.getTime() + CHINA_OFFSET_MS);
  const startUtc: number = Date.UTC(
    chinaNow.getUTCFullYear(),
    chinaNow.getUTCMonth(),
    chinaNow.getUTCDate(),
  ) - CHINA_OFFSET_MS;
  return {
    start: new Date(startUtc),
    end: new Date(startUtc + 24 * 60 * 60 * 1000 - 1),
  };
}
