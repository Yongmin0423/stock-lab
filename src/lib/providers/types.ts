export type Market = "US" | "KR";

export interface Quote {
  symbol: string; // "US:AAPL" | "KR:005930"
  name: string;
  market: Market;
  price: number;
  changePct: number;
  currency: "USD" | "KRW";
  asOf: Date;
  isMock: boolean; // 모의 데이터 여부 (API 키 없을 때)
}

export interface Fundamentals {
  per?: number;
  pbr?: number;
  eps?: number;
  roe?: number;
  debtToEquity?: number;
  dividendYield?: number;
  marketCap?: number;
  w52High?: number;
  w52Low?: number;
}

export interface Candle {
  date: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  headline: string;
  source: string;
  url: string;
  publishedAt: Date;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  market: Market;
}

export function isKrOnlySearchQuery(query: string): boolean {
  return /[가-힣]/.test(query) || /^\d+$/.test(query);
}

/** 시장별 데이터 소스 추상화. M4에서 KisProvider 추가 예정 */
export interface MarketDataProvider {
  market: Market;
  getQuote(code: string): Promise<Omit<Quote, "symbol" | "name">>;
  getDailyCandles(code: string, days: number): Promise<Candle[]>;
  getFundamentals(code: string): Promise<Fundamentals>;
  getNews(code: string, name: string): Promise<NewsItem[]>;
  searchSymbol(query: string): Promise<SymbolInfo[]>;
}

/** "US:AAPL" → { market: "US", code: "AAPL" }; 기존 접두어 없는 심볼도 호환 */
export function parseSymbol(full: string): { market: Market; code: string } {
  if (/^\d{6}$/.test(full)) return { market: "KR", code: full };
  if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(full)) return { market: "US", code: full };

  const [market, code] = full.split(":");
  if ((market !== "US" && market !== "KR") || !code) {
    throw new Error(`잘못된 심볼 형식: ${full} (예: "US:AAPL", "KR:005930")`);
  }
  return { market, code };
}
