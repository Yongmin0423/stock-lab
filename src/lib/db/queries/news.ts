import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { news } from "@/lib/db/schema";

const PAGE_SIZE = 30;

/** /news 피드용 — DB만 조회 (외부 API 0회, 즉시 응답). 갱신은 /api/refresh-news 또는 cron이 담당 */
export async function listAllNews(opts: { page?: number; symbol?: string } = {}) {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const cond = opts.symbol ? eq(news.stockSymbol, opts.symbol) : undefined;

  const base = db.select().from(news);
  const countBase = db.select({ count: sql<number>`count(*)::int` }).from(news);

  const [rows, totalRows] = [
    await (cond ? base.where(cond) : base)
      .orderBy(desc(news.publishedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    await (cond ? countBase.where(cond) : countBase),
  ];

  const total = totalRows[0]?.count ?? 0;
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
