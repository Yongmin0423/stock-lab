import { and, arrayOverlaps, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export type NoteRow = typeof notes.$inferSelect;

export async function listNotes(opts: { tag?: string; q?: string } = {}): Promise<NoteRow[]> {
  const db = getDb();
  const conds = [];
  if (opts.tag) conds.push(arrayOverlaps(notes.tags, [opts.tag]));
  if (opts.q) conds.push(or(ilike(notes.title, `%${opts.q}%`), ilike(notes.content, `%${opts.q}%`)));

  const base = db.select().from(notes);
  const rows = conds.length
    ? await base.where(and(...conds)).orderBy(desc(notes.updatedAt))
    : await base.orderBy(desc(notes.updatedAt));
  return rows;
}

export async function getNote(id: number): Promise<NoteRow | undefined> {
  const db = getDb();
  return db.query.notes.findFirst({ where: eq(notes.id, id) });
}

/** 태그 필터 칩용: 태그별 개수 */
export async function tagCounts(): Promise<Array<{ tag: string; count: number }>> {
  const db = getDb();
  const rows = await db.execute<{ tag: string; count: string }>(
    sql`SELECT unnest(tags) AS tag, count(*) AS count FROM notes GROUP BY tag ORDER BY count DESC, tag`,
  );
  return [...rows].map((r) => ({ tag: r.tag, count: +r.count }));
}

export async function upsertNote(data: {
  id?: number;
  title: string;
  content: string;
  tags: string[];
  source: string | null;
  relatedSymbols: string[];
}) {
  const db = getDb();
  if (data.id) {
    await db
      .update(notes)
      .set({ ...data, id: undefined, updatedAt: new Date() })
      .where(eq(notes.id, data.id));
    return data.id;
  }
  const [row] = await db.insert(notes).values(data).returning({ id: notes.id });
  return row.id;
}

export async function removeNote(id: number) {
  const db = getDb();
  await db.delete(notes).where(eq(notes.id, id));
}

/**
 * AI 분석용 관련 노트 선별 (M7):
 * 관련 종목 일치 > 최신순. 최대 limit개.
 * Phase 2에서 임베딩 검색으로 교체 예정 (기획서 §5.2)
 */
export async function findRelevantNotes(symbol: string, limit = 5): Promise<NoteRow[]> {
  const db = getDb();
  return db
    .select()
    .from(notes)
    .orderBy(sql`(${symbol} = ANY(${notes.relatedSymbols})) DESC`, desc(notes.updatedAt))
    .limit(limit);
}
