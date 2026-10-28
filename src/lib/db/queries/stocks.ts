import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { getQuoteCached } from "@/lib/cache";
import { getDb, hasDb } from "@/lib/db";
import { stocks } from "@/lib/db/schema";
import type { Market, Quote } from "@/lib/providers/types";

export async function getWatchlist() {
  const db = getDb();
  return db.select().from(stocks).orderBy(asc(stocks.addedAt));
}

/** 대시보드용: watchlist + 각 종목 시세 (캐시 경유, KIS 초당 제한 대비 순차 호출) */
export async function getWatchlistWithQuotes(
  onFailure?: (failure: { name: string; message: string; usingCache: boolean }) => void,
): Promise<Quote[]> {
  const list = await getWatchlist();
  const quotes: Quote[] = [];
  for (const s of list) {
    const q = await getQuoteCached(s.symbol, s.name, false, (message, usingCache) =>
      onFailure?.({ name: s.name, message, usingCache }),
    );
    if (q) quotes.push(q);
  }
  return quotes;
}

/**
 * 대시보드 카드 부가정보 — 전부 DB만 조회 (외부 API 0회, 속도 우선)
 * 스파크라인은 상세 페이지를 방문해 일봉이 캐시된 뒤부터 채워짐
 */
export async function getDashboardExtras(symbols: string[]) {
  const db = getDb();
  const { candles, financials } = await import("@/lib/db/schema");
  const { asc, gte, inArray, and } = await import("drizzle-orm");

  const closes: Record<string, number[]> = {};
  const funds: Record<string, typeof financials.$inferSelect> = {};
  if (symbols.length === 0) return { closes, funds };

  const cutoff = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const candleRows = await db
    .select({ symbol: candles.stockSymbol, date: candles.date, close: candles.close })
    .from(candles)
    .where(and(inArray(candles.stockSymbol, symbols), gte(candles.date, cutoff)))
    .orderBy(asc(candles.date));
  for (const r of candleRows) {
    if (!r.symbol) continue;
    (closes[r.symbol] ??= []).push(r.close);
  }

  const fundRows = await db.select().from(financials).where(inArray(financials.stockSymbol, symbols));
  for (const r of fundRows) funds[r.stockSymbol] = r;

  return { closes, funds };
}

export async function insertStock(symbol: string, name: string, market: Market) {
  const db = getDb();
  await db.insert(stocks).values({ symbol, name, market }).onConflictDoNothing();
}

export async function deleteStock(symbol: string) {
  const db = getDb();
  await db.delete(stocks).where(eq(stocks.symbol, symbol));
}

/** 메타데이터와 본문에서 같은 등록 종목을 조회한다. */
export const getStock = cache(async (symbol: string) => {
  if (!hasDb()) return undefined;
  return getDb().query.stocks.findFirst({ where: eq(stocks.symbol, symbol) });
});
