import { hasAiKey } from "@/lib/ai/analyze";
import { mockBriefing, runBriefing, type BriefingContext, type BriefingStockInput } from "@/lib/ai/briefing";
import { getFundamentalsCached, getNewsCached, getQuoteCached } from "@/lib/cache";
import { insertBriefing, latestBriefing, type BriefingRow } from "@/lib/db/queries/briefings";
import { listAnalyses } from "@/lib/db/queries/analyses";
import { listNotes } from "@/lib/db/queries/notes";
import { listEnabledRules } from "@/lib/db/queries/rules";
import { getWatchlist } from "@/lib/db/queries/stocks";
import { getMarketBar } from "@/lib/market-overview";
import { evaluateRules, ruleMetrics } from "@/lib/rules";
import { createBriefingSnapshot, readBriefingSnapshots } from "@/lib/briefing-snapshot";
import { compareBriefingSnapshots } from "@/lib/research/briefing-comparison";
import { compareBriefingOnWorker } from "@/lib/research/client";

/** 브리핑 생성 전체 파이프라인 — 수동 버튼(/api/briefing)과 cron(/api/cron/briefing)이 공용 */
export async function generateBriefing(slot: "morning" | "evening"): Promise<{ row: BriefingRow; isMock: boolean }> {
  const list = await getWatchlist();
  if (list.length === 0) throw new Error("watchlist가 비어 있어요");

  const enabledRules = await listEnabledRules();
  const prev = await latestBriefing();
  const notes = await listNotes();
  const market = await getMarketBar();

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
      quoteAt: quote?.asOf ?? null,
      isMock: quote?.isMock ?? false,
      fundamentals: fund
        ? {
            per: fund.per,
            pbr: fund.pbr,
            eps: fund.eps,
            roe: fund.roe,
            debtToEquity: fund.debtToEquity,
            dividendYield: fund.dividendYield,
            marketCap: fund.marketCap,
            w52High: fund.w52High,
            w52Low: fund.w52Low,
            fetchedAt: fund.fetchedAt,
          }
        : null,
      ruleResults: evaluateRules(ruleMetrics(fund), enabledRules),
      latestAnalysis: latest
        ? {
            verdict: latest.verdict,
            confidence: latest.confidence,
            createdAt: latest.createdAt,
            priceAtAnalysis: latest.priceAtAnalysis,
            reasons: latest.reasons ?? [],
            risks: latest.risks ?? [],
            challenges: latest.challenges ?? [],
          }
        : null,
      news: newsRows.slice(0, 8).map((n) => ({
        headline: n.headline,
        source: n.source,
        url: n.url,
        publishedAt: n.publishedAt,
        isNew: n.publishedAt != null && (!prev || n.publishedAt > prev.createdAt),
      })),
      relatedNotes: notes
        .filter((n) => n.relatedSymbols.includes(s.symbol))
        .slice(0, 3)
        .map((n) => ({ id: n.id, title: n.title, tags: n.tags, content: n.content.slice(0, 250) })),
    });
  }

  const noteDigest = notes
    .slice(0, 5)
    .map((n) => `- [note-${n.id}] [${n.tags.join(",")}] ${n.title}: ${n.content.slice(0, 250)}`)
    .join("\n");

  const capturedAt = new Date().toISOString();
  const snapshots = stocks.map((stock) => createBriefingSnapshot(stock, capturedAt));
  const comparisonInput = { current: snapshots, previous: readBriefingSnapshots(prev?.stockSections) };
  const mode = process.env.RESEARCH_BRIEFING_COMPARE_MODE ?? "local";
  if (mode !== "local" && mode !== "worker") throw new Error("RESEARCH_BRIEFING_COMPARE_MODE는 local 또는 worker여야 합니다.");
  const comparisons = mode === "worker" ? await compareBriefingOnWorker(comparisonInput) : compareBriefingSnapshots(comparisonInput);
  const ctx: BriefingContext = {
    slot, market, stocks, noteDigest, prevBriefingAt: prev?.createdAt ?? null, capturedAt, comparisons,
    previousBriefing: prev ? {
      id: prev.id, createdAt: prev.createdAt.toISOString(), marketSummary: prev.marketSummary?.slice(0, 2_000) ?? "",
      stockSections: (prev.stockSections ?? []).filter((section) => list.some((stock) => stock.symbol === section.symbol))
        .map((section) => ({ symbol: section.symbol, summary: section.summary.slice(0, 2_000) })),
      watchItems: (prev.watchItems ?? []).filter((item) => list.some((stock) => stock.symbol === item.symbol)).slice(0, 10)
        .map((item) => ({ symbol: item.symbol, reason: item.reason.slice(0, 1_000), basis: item.basis.slice(0, 1_000) })),
    } : null,
  };
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
      snapshot: snapshots.find((snapshot) => snapshot.symbol === sec.symbol),
      comparison: comparisons.find((comparison) => comparison.symbol === sec.symbol),
    })),
    watchItems: result.watch_items.map((w) => ({ ...w, name: nameOf(w.symbol) })),
  });

  return { row, isMock: !hasAiKey() };
}
