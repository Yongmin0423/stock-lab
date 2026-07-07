import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { discoveries } from "@/lib/db/schema";

export type DiscoveryRow = typeof discoveries.$inferSelect;

export async function insertDiscovery(data: {
  picks: Array<{ symbol: string; name: string; fit_score: number; reason: string; cited: string; caution: string }>;
  scannedCount: number;
  candidateCount: number;
}): Promise<DiscoveryRow> {
  const db = getDb();
  const [row] = await db.insert(discoveries).values(data).returning();
  return row;
}

export async function latestDiscovery(): Promise<DiscoveryRow | undefined> {
  const db = getDb();
  return db.query.discoveries.findFirst({ orderBy: desc(discoveries.createdAt) });
}
