import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { briefings } from "@/lib/db/schema";

export type BriefingRow = typeof briefings.$inferSelect;

export async function insertBriefing(data: {
  slot: "morning" | "evening";
  marketSummary: string;
  stockSections: Array<{ symbol: string; name: string; changePct: number | null; summary: string }>;
  watchItems: Array<{ symbol: string; name: string; reason: string; basis: string }>;
}): Promise<BriefingRow> {
  const db = getDb();
  const [row] = await db.insert(briefings).values(data).returning();
  return row;
}

export async function listBriefings(limit = 14): Promise<BriefingRow[]> {
  const db = getDb();
  return db.select().from(briefings).orderBy(desc(briefings.createdAt)).limit(limit);
}

export async function getBriefing(id: number): Promise<BriefingRow | undefined> {
  const db = getDb();
  return db.query.briefings.findFirst({ where: eq(briefings.id, id) });
}

export async function latestBriefing(): Promise<BriefingRow | undefined> {
  const db = getDb();
  return db.query.briefings.findFirst({ orderBy: desc(briefings.createdAt) });
}
