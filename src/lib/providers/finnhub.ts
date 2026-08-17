import { getUsDailyCandles } from "./kis";
import type { Candle, Fundamentals, MarketDataProvider, NewsItem, SymbolInfo } from "./types";

const BASE = "https://finnhub.io/api/v1";
const TIMEOUT_MS = 5_000;

function apiKey(): string | undefined {
  return process.env.FINNHUB_API_KEY || undefined;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = apiKey();
  if (!token) throw new Error("FINNHUB_API_KEY 미설정");
  const qs = new URLSearchParams({ ...params, token });
  const res = await fetch(`${BASE}${path}?${qs}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const finnhub: MarketDataProvider = {
  market: "US",

  async getQuote(code) {
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

    // 2순위: 기존 KIS 인증으로 미국 주식 일봉 조회
    return getUsDailyCandles(code, days);
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
    if (!apiKey()) return [];
    const d = await get<{ result: Array<{ symbol: string; description: string }> }>("/search", { q: query });
    return d.result
      .filter((r) => !r.symbol.includes("."))
      .slice(0, 8)
      .map((r) => ({ symbol: `US:${r.symbol}`, name: r.description, market: "US" as const }));
  },
};
