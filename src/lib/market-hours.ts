import type { Market } from "./providers/types";

/** MVP 단순 버전: 휴장일 미반영 (기획서 §4.3 — Phase 2에서 캘린더 추가) */
export function isMarketOpen(market: Market, now = new Date()): boolean {
  if (market === "KR") {
    const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const day = kst.getDay();
    if (day === 0 || day === 6) return false;
    const mins = kst.getHours() * 60 + kst.getMinutes();
    return mins >= 540 && mins <= 930; // 09:00 ~ 15:30 KST
  }
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 570 && mins < 960; // 09:30 ~ 16:00 ET (서머타임 자동 반영)
}
