import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { screeningFundamentals, stocksMaster } from "@/lib/db/schema";
import { seedUsIfEmpty } from "@/lib/db/queries/master";

export async function listScreeningRefreshTargets(limit: number, market: "US" | "KR") {
  await seedUsIfEmpty();
  const db = getDb();
  return db
    .select({
      code: stocksMaster.code,
      name: stocksMaster.name,
      market: stocksMaster.market,
    })
    .from(stocksMaster)
    .leftJoin(
      screeningFundamentals,
      sql`${screeningFundamentals.symbol} = ${stocksMaster.market} || ':' || ${stocksMaster.code}`,
    )
    .where(
      and(
        eq(stocksMaster.market, market),
        or(isNull(screeningFundamentals.fetchedAt), lt(screeningFundamentals.fetchedAt, new Date(Date.now() - 30 * 86400e3))),
      ),
    )
    .orderBy(sql`${screeningFundamentals.fetchedAt} asc nulls first`, asc(stocksMaster.code))
    .limit(limit);
}

export async function upsertScreeningFundamentals(data: typeof screeningFundamentals.$inferInsert) {
  const db = getDb();
  await db
    .insert(screeningFundamentals)
    .values(data)
    .onConflictDoUpdate({ target: screeningFundamentals.symbol, set: data });
}

export async function listScreeningFundamentals() {
  return getDb().select().from(screeningFundamentals).orderBy(asc(screeningFundamentals.symbol));
}
