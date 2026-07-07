import { finnhub } from "./providers/finnhub";
import { getKospiIndex } from "./providers/kis";

export interface MarketBarItem {
  name: string;
  value: string;
  changePct: number | null;
  open?: boolean;
}

/**
 * 시장 상태 바 데이터 (기획서 §4.6)
 * - 미국 지수: ETF 프록시 (SPY/QQQ) — 지수 직접 조회는 유료인 경우가 많음
 * - KOSPI: KIS 지수 API (키 없으면 생략)
 * - 환율: open.er-api.com (무료·키 불필요, 1시간 캐시)
 */
export async function getMarketBar(): Promise<MarketBarItem[]> {
  const items: MarketBarItem[] = [];

  // KOSPI (KIS 키 있을 때만)
  const kospi = await getKospiIndex();
  if (kospi) {
    items.push({
      name: "KOSPI",
      value: kospi.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 }),
      changePct: kospi.changePct,
    });
  }

  // 미국 지수 (ETF 프록시) — 순차 호출
  for (const [name, ticker] of [
    ["S&P500", "SPY"],
    ["나스닥", "QQQ"],
  ] as const) {
    try {
      const q = await finnhub.getQuote(ticker);
      items.push({
        name: `${name}${q.isMock ? "*" : ""}`,
        value: q.price.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        changePct: q.changePct,
      });
    } catch {
      // 스킵
    }
  }

  // 원달러 환율 (키 불필요, Next fetch 캐시 1시간)
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    const d = await res.json();
    const krw = d?.rates?.KRW;
    if (krw) {
      items.push({ name: "USD/KRW", value: Number(krw).toLocaleString("ko-KR", { maximumFractionDigits: 1 }), changePct: null });
    }
  } catch {
    // 스킵
  }

  return items;
}
