import { finnhub } from "./finnhub";
import { kis } from "./kis";
import { parseSymbol, type MarketDataProvider, type Quote } from "./types";

/** market 기준 Provider 라우팅 */
export function providerFor(fullSymbol: string): MarketDataProvider {
  const { market } = parseSymbol(fullSymbol);
  return market === "US" ? finnhub : kis;
}

/** 시세 조회 (KIS 초당 제한 대비 — 병렬 아닌 순차 호출) */
export async function getQuotes(items: Array<{ symbol: string; name: string }>): Promise<Quote[]> {
  const out: Quote[] = [];
  for (const item of items) {
    const { code } = parseSymbol(item.symbol);
    try {
      const q = await providerFor(item.symbol).getQuote(code);
      out.push({ ...q, symbol: item.symbol, name: item.name });
    } catch {
      // 한 종목 실패가 전체를 막지 않도록 스킵
    }
  }
  return out;
}
