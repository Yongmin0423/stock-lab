import { stooqDailyCandles, syntheticCandles } from "./stooq";
import type { Candle, Fundamentals, MarketDataProvider, NewsItem, SymbolInfo } from "./types";

const BASE = "https://finnhub.io/api/v1";

/** 키가 없을 때 쓰는 모의 시세 (가격에 약간의 랜덤 변동을 줘서 살아있는 느낌) */
const MOCK_QUOTES: Record<string, { price: number; changePct: number }> = {
  AAPL: { price: 248.12, changePct: -0.87 },
  MSFT: { price: 512.4, changePct: 0.42 },
  NVDA: { price: 176.75, changePct: 1.93 },
  GOOGL: { price: 201.33, changePct: -0.21 },
  TSLA: { price: 322.18, changePct: 2.75 },
};

function apiKey(): string | undefined {
  return process.env.FINNHUB_API_KEY || undefined;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, token: apiKey()! });
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

function mockQuote(code: string) {
  const base = MOCK_QUOTES[code] ?? { price: 100, changePct: 0 };
  const jitter = 1 + (Math.random() - 0.5) * 0.002;
  return {
    market: "US" as const,
    price: +(base.price * jitter).toFixed(2),
    changePct: base.changePct,
    currency: "USD" as const,
    asOf: new Date(),
    isMock: true,
  };
}

export const finnhub: MarketDataProvider = {
  market: "US",

  async getQuote(code) {
    if (!apiKey()) return mockQuote(code);
    const d = await get<{ c: number; dp: number | null }>("/quote", { symbol: code });
    if (!d.c) throw new Error(`시세 없음: ${code}`);
    return {
      market: "US",
      price: d.c,
      changePct: d.dp ?? 0,
      currency: "USD",
      asOf: new Date(),
      isMock: false,
    };
  },

  async getFundamentals(code): Promise<Fundamentals> {
    if (!apiKey()) return { per: 28.5, pbr: 42.1, eps: 8.71, roe: 147.2 }; // mock
    const d = await get<{ metric?: Record<string, number> }>("/stock/metric", {
      symbol: code,
      metric: "all",
    });
    const m = d.metric ?? {};
    return {
      per: m["peTTM"],
      pbr: m["pbQuarterly"],
      eps: m["epsTTM"],
      roe: m["roeTTM"],
      dividendYield: m["currentDividendYieldTTM"],
      marketCap: m["marketCapitalization"],
      w52High: m["52WeekHigh"],
      w52Low: m["52WeekLow"],
      debtToEquity: m["totalDebt/totalEquityQuarterly"],
    };
  },

  async getDailyCandles(code, days): Promise<Candle[]> {
    const cutoff = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10);

    // 1순위: Finnhub candle (무료 티어에서 403인 경우 있음)
    if (apiKey()) {
      try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - days * 86400;
        const d = await get<{ s: string; t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[] }>(
          "/stock/candle",
          { symbol: code, resolution: "D", from: String(from), to: String(to) },
        );
        if (d.s === "ok") {
          return d.t.map((t, i) => ({
            date: new Date(t * 1000).toISOString().slice(0, 10),
            open: d.o[i],
            high: d.h[i],
            low: d.l[i],
            close: d.c[i],
            volume: d.v[i],
          }));
        }
      } catch {
        // 폴백으로 진행
      }
    }

    // 2순위: Stooq (무료, 키 불필요)
    try {
      const all = await stooqDailyCandles(code);
      return all.filter((c) => c.date >= cutoff);
    } catch {
      // 3순위: 합성 캔들 (데모용)
      return syntheticCandles(days, MOCK_QUOTES[code]?.price ?? 100);
    }
  },

  async getNews(code): Promise<NewsItem[]> {
    if (!apiKey()) return [];
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10);
    const d = await get<Array<{ headline: string; source: string; url: string; datetime: number }>>(
      "/company-news",
      { symbol: code, from, to },
    );
    return d.slice(0, 20).map((n) => ({
      headline: n.headline,
      source: n.source,
      url: n.url,
      publishedAt: new Date(n.datetime * 1000),
    }));
  },

  async searchSymbol(query): Promise<SymbolInfo[]> {
    if (!apiKey()) {
      return Object.keys(MOCK_QUOTES)
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
        .map((s) => ({ symbol: `US:${s}`, name: s, market: "US" }));
    }
    const d = await get<{ result: Array<{ symbol: string; description: string }> }>("/search", { q: query });
    return d.result
      .filter((r) => !r.symbol.includes("."))
      .slice(0, 8)
      .map((r) => ({ symbol: `US:${r.symbol}`, name: r.description, market: "US" as const }));
  },
};
