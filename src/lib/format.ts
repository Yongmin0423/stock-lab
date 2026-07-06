import type { Market } from "./providers/types";

export function formatPrice(price: number, market: Market): string {
  return market === "KR"
    ? `${Math.round(price).toLocaleString("ko-KR")}원`
    : `$${price.toFixed(2)}`;
}

export function formatChange(pct: number): string {
  return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

/** 상승=빨강, 하락=파랑 (한국 관례). 목업 디자인 토큰과 동일 */
export function changeColorClass(pct: number): string {
  if (pct > 0) return "text-[#f04452]";
  if (pct < 0) return "text-[#3182f6]";
  return "text-zinc-400";
}

/** 시가총액 등 큰 숫자. Finnhub marketCap은 백만 달러 단위 */
export function formatMarketCap(millions: number | null | undefined, market: Market): string {
  if (millions == null) return "—";
  if (market === "US") {
    const usd = millions * 1e6;
    if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`;
    if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
    return `$${(usd / 1e6).toFixed(0)}M`;
  }
  const krw = millions; // KIS는 원 단위로 저장 예정 (M4)
  if (krw >= 1e12) return `${(krw / 1e12).toFixed(1)}조`;
  return `${(krw / 1e8).toFixed(0)}억`;
}

export function formatMetric(v: number | null | undefined, suffix = ""): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${suffix}`;
}

export function timeAgo(d: Date | null): string {
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
