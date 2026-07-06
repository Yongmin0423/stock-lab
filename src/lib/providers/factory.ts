import { finnhub } from "./finnhub";
import { parseSymbol, type MarketDataProvider, type Quote } from "./types";

/** market 기준 Provider 라우팅. M4에서 KR → kis 추가 */
export function providerFor(fullSymbol: string): MarketDataProvider {
  const { market } = parseSymbol(fullSymbol);
  if (market === "US") return finnhub;
  throw new Error("한국 주식(KIS)은 M4에서 지원 예정입니다.");
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
