import { asc, eq } from "drizzle-orm";
import { getQuoteCached } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { stocks } from "@/lib/db/schema";
import type { Market, Quote } from "@/lib/providers/types";

export async function getWatchlist() {
  const db = getDb();
  return db.select().from(stocks).orderBy(asc(stocks.addedAt));
}

/** 대시보드용: watchlist + 각 종목 시세 (캐시 경유, KIS 초당 제한 대비 순차 호출) */
export async function getWatchlistWithQuotes(): Promise<Quote[]> {
  const list = await getWatchlist();
  const out: Quote[] = [];
  for (const s of list) {
    const q = await getQuoteCached(s.symbol, s.name);
    if (q) out.push(q);
  }
  return out;
}

export async function insertStock(symbol: string, name: string, market: Market) {
  const db = getDb();
  await db.insert(stocks).values({ symbol, name, market }).onConflictDoNothing();
}

export async function deleteStock(symbol: string) {
  const db = getDb();
  await db.delete(stocks).where(eq(stocks.symbol, symbol));
}
