import { and, asc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { stocksMaster } from "@/lib/db/schema";
import { UNIVERSE_US } from "@/lib/universe";

const PAGE_SIZE = 50;

/** 미국 대형주 시드 (1회) — 전체 종목 목록에 US도 보이도록 */
export async function seedUsIfEmpty() {
  const db = getDb();
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(stocksMaster)
    .where(eq(stocksMaster.market, "US"));
  if (c > 0) return;
  await db
    .insert(stocksMaster)
    .values(UNIVERSE_US.map((u) => ({ code: u.symbol.replace("US:", ""), name: u.name, market: "US" as const })))
    .onConflictDoNothing();
}

/** 전체 종목 목록 — 페이지네이션 + 이름/코드 필터 + 시장 필터 */
export async function listMaster(opts: { page?: number; q?: string; market?: "US" | "KR" } = {}) {
  await seedUsIfEmpty();
  return listMasterCached(opts);
}

async function listMasterCached(opts: { page?: number; q?: string; market?: "US" | "KR" }) {
  "use cache";
  cacheLife("days");
  cacheTag("stocks-master");

  const db = getDb();

  const page = Math.max(1, opts.page ?? 1);
  const conds: SQL[] = [];
  if (opts.market) conds.push(eq(stocksMaster.market, opts.market));
  if (opts.q) {
    conds.push(
      /^\d+$/.test(opts.q)
        ? ilike(stocksMaster.code, `${opts.q}%`)
        : ilike(stocksMaster.name, `%${opts.q}%`),
    );
  }
  const cond = conds.length ? and(...conds) : undefined;

  const base = db.select().from(stocksMaster);
  const countBase = db.select({ count: sql<number>`count(*)::int` }).from(stocksMaster);

  const [rows, totalRows] = [
    await (cond ? base.where(cond) : base)
      .orderBy(asc(stocksMaster.market), asc(stocksMaster.name)) // KR 먼저, 이름순
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    await (cond ? countBase.where(cond) : countBase),
  ];

  const total = totalRows[0]?.count ?? 0;
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
