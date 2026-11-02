import type { BriefingStockInput } from "./ai/briefing.ts";
import { BriefingSnapshotSchema, type BriefingSnapshot } from "./research/briefing-comparison.ts";

export function createBriefingSnapshot(stock: BriefingStockInput, capturedAt: string): BriefingSnapshot {
  return BriefingSnapshotSchema.parse({
    version: 1, symbol: stock.symbol, capturedAt, price: stock.price,
    quoteAt: stock.quoteAt?.toISOString() ?? null, isMock: stock.isMock,
    fundamentalsAt: stock.fundamentals?.fetchedAt.toISOString() ?? null,
    metrics: {
      per: stock.fundamentals?.per ?? null, pbr: stock.fundamentals?.pbr ?? null,
      eps: stock.fundamentals?.eps ?? null, roe: stock.fundamentals?.roe ?? null,
      debtToEquity: stock.fundamentals?.debtToEquity ?? null, dividendYield: stock.fundamentals?.dividendYield ?? null,
    },
    rules: stock.ruleResults.map((rule) => ({
      name: rule.name,
      definition: JSON.stringify(rule.details.map((detail) => [detail.metric, detail.target]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))),
      passed: rule.details.length === 0 || rule.details.some((detail) => detail.value === null || !Number.isFinite(detail.value)) ? null : rule.passed,
    })),
  });
}

export function readBriefingSnapshots(sections: Array<{ symbol: string; snapshot?: unknown }> | null | undefined): BriefingSnapshot[] {
  return (sections ?? []).flatMap((section) => {
    const parsed = BriefingSnapshotSchema.safeParse(section.snapshot);
    return parsed.success && parsed.data.symbol === section.symbol ? [parsed.data] : [];
  });
}
