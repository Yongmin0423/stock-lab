import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getDb, hasDb } from "@/lib/db";
import { stocks, notes, briefings } from "@/lib/db/schema";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = ["/", "/stocks", "/briefing", "/discover", "/news", "/notes"]
    .map((path) => ({ url: new URL(path, base).href }));
  if (!hasDb()) return entries;

  const db = getDb();
  const stockRows = await db.select({ symbol: stocks.symbol }).from(stocks);
  const noteRows = await db.select({ id: notes.id, updatedAt: notes.updatedAt }).from(notes);
  const briefingRows = await db.select({ id: briefings.id, createdAt: briefings.createdAt }).from(briefings);
  return [
    ...entries,
    ...stockRows.map((stock) => ({ url: new URL(`/stock/${encodeURIComponent(stock.symbol)}`, base).href })),
    ...noteRows.map((note) => ({ url: new URL(`/notes/${note.id}`, base).href, lastModified: note.updatedAt })),
    ...briefingRows.map((briefing) => ({ url: new URL(`/briefing?id=${briefing.id}`, base).href, lastModified: briefing.createdAt })),
  ];
}
