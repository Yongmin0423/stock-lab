import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { analyses } from "@/lib/db/schema";
import type { AnalysisResult } from "@/lib/ai/analyze";

export type AnalysisRow = typeof analyses.$inferSelect;

export async function insertAnalysis(
  symbol: string,
  result: AnalysisResult,
  priceAtAnalysis: number | null,
  trigger: "manual" | "briefing" = "manual",
): Promise<AnalysisRow> {
  const db = getDb();
  const citedNoteIds = result.cited_notes
    .map((s) => Number(s.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  const [row] = await db
    .insert(analyses)
    .values({
      stockSymbol: symbol,
      verdict: result.verdict,
      confidence: Math.round(result.confidence),
      reasons: result.reasons,
      risks: result.risks,
      challenges: result.challenges,
      citedNoteIds,
      priceAtAnalysis,
      trigger,
    })
    .returning();
  return row;
}

export async function listAnalyses(symbol: string, limit = 10): Promise<AnalysisRow[]> {
  const db = getDb();
  return db
    .select()
    .from(analyses)
    .where(eq(analyses.stockSymbol, symbol))
    .orderBy(desc(analyses.createdAt))
    .limit(limit);
}
