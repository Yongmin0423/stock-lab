import type { Candle } from "./types";

/**
 * Stooq — 무료 일봉 CSV (키 불필요).
 * Finnhub 무료 티어가 candle API를 제한하는 경우의 백업 소스.
 * 예: https://stooq.com/q/d/l/?s=aapl.us&i=d
 */
export async function stooqDailyCandles(usTicker: string): Promise<Candle[]> {
  const res = await fetch(`https://stooq.com/q/d/l/?s=${usTicker.toLowerCase()}.us&i=d`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Stooq ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split("\n");
  if (lines.length < 2 || !lines[0].startsWith("Date")) throw new Error("Stooq: 데이터 없음");

  return lines
    .slice(1)
    .map((line) => {
      const [date, open, high, low, close, volume] = line.split(",");
      return {
        date,
        open: +open,
        high: +high,
        low: +low,
        close: +close,
        volume: +volume || 0,
      };
    })
    .filter((c) => Number.isFinite(c.close));
}

/** 모든 소스 실패 시 데모용 합성 캔들 (랜덤워크) — UI가 죽지 않게 */
export function syntheticCandles(days: number, startPrice = 150): Candle[] {
  const out: Candle[] = [];
  let price = startPrice;
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400e3);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const drift = (Math.random() - 0.48) * 0.03;
    const open = price;
    const close = price * (1 + drift);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    out.push({
      date: d.toISOString().slice(0, 10),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(1e6 * (1 + Math.random())),
    });
    price = close;
  }
  return out;
}
