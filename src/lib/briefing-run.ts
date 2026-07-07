import { hasAiKey } from "@/lib/ai/analyze";
import { mockBriefing, runBriefing, type BriefingContext, type BriefingStockInput } from "@/lib/ai/briefing";
import { getFundamentalsCached, getNewsCached, getQuoteCached } from "@/lib/cache";
import { insertBriefing, latestBriefing, type BriefingRow } from "@/lib/db/queries/briefings";
import { listAnalyses } from "@/lib/db/queries/analyses";
import { listNotes } from "@/lib/db/queries/notes";
import { listEnabledRules } from "@/lib/db/queries/rules";
import { getWatchlist } from "@/lib/db/queries/stocks";
import { evaluateRules } from "@/lib/rules";

/** 브리핑 생성 전체 파이프라인 — 수동 버튼(/api/briefing)과 cron(/api/cron/briefing)이 공용 */
export async function generateBriefing(slot: "morning" | "evening"): Promise<{ row: BriefingRow; isMock: boolean }> {
  const list = await getWatchlist();
  if (list.length === 0) throw new Error("watchlist가 비어 있어요");

  const enabledRules = await listEnabledRules();
  const prev = await latestBriefing();

  // 순차 수집 (KIS 초당 제한 대비, 대부분 캐시 히트)
  const stocks: BriefingStockInput[] = [];
  for (const s of list) {
    const quote = await getQuoteCached(s.symbol, s.name);
    const fund = await getFundamentalsCached(s.symbol);
    const newsRows = await getNewsCached(s.symbol, s.name);
    const [latest] = await listAnalyses(s.symbol, 1);

    stocks.push({
      symbol: s.symbol,
      name: s.name,
      price: quote?.price ?? null,
      changePct: quote?.changePct ?? null,
      ruleResults: evaluateRules(
        {
          per: fund?.per ?? null,
          pbr: fund?.pbr ?? null,
          eps: fund?.eps ?? null,
          roe: fund?.roe ?? null,
          debtToEquity: fund?.debtToEquity ?? null,
          dividendYield: fund?.dividendYield ?? null,
        },
        enabledRules,
      ),
      latestAnalysis: latest
        ? { verdict: latest.verdict, createdAt: latest.createdAt, reasons: latest.reasons ?? [] }
        : null,
      headlines: newsRows.slice(0, 5).map((n) => n.headline),
    });
  }

  const notes = await listNotes();
  const noteDigest = notes
    .slice(0, 8)
    .map((n) => `- [${n.tags.join(",")}] ${n.title}: ${n.content.slice(0, 150)}`)
    .join("\n");

  const ctx: BriefingContext = { slot, stocks, noteDigest, prevBriefingAt: prev?.createdAt ?? null };
  const result = hasAiKey() ? await runBriefing(ctx) : mockBriefing(ctx);
  const nameOf = (sym: string) => list.find((s) => s.symbol === sym)?.name ?? sym;

  const row = await insertBriefing({
    slot,
    marketSummary: result.market_summary,
    stockSections: result.stock_sections.map((sec) => ({
      symbol: sec.symbol,
      name: nameOf(sec.symbol),
      changePct: stocks.find((s) => s.symbol === sec.symbol)?.changePct ?? null,
      summary: sec.summary,
    })),
    watchItems: result.watch_items.map((w) => ({ ...w, name: nameOf(w.symbol) })),
  });

  return { row, isMock: !hasAiKey() };
}
