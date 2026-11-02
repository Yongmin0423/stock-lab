import { z } from "zod";

const timestamp = z.string().datetime();
const metricKeys = ["per", "pbr", "eps", "roe", "debtToEquity", "dividendYield"] as const;
const number = z.number().finite().nullable();
export const BriefingSnapshotSchema = z.object({
  version: z.literal(1),
  symbol: z.string().min(1).max(30),
  capturedAt: timestamp,
  price: number,
  quoteAt: timestamp.nullable(),
  isMock: z.boolean(),
  fundamentalsAt: timestamp.nullable(),
  metrics: z.object({ per: number, pbr: number, eps: number, roe: number, debtToEquity: number, dividendYield: number }),
  rules: z.array(z.object({ name: z.string().max(200), definition: z.string().max(2_000), passed: z.boolean().nullable() })).max(100),
});
export type BriefingSnapshot = z.infer<typeof BriefingSnapshotSchema>;
export const ComparisonInputSchema = z.object({
  current: z.array(BriefingSnapshotSchema).max(100),
  previous: z.array(BriefingSnapshotSchema).max(100),
}).superRefine((input, ctx) => {
  for (const key of ["current", "previous"] as const) {
    if (new Set(input[key].map((row) => row.symbol)).size !== input[key].length) ctx.addIssue({ code: "custom", message: "Duplicate symbol", path: [key] });
  }
});
export type ComparisonInput = z.infer<typeof ComparisonInputSchema>;
export const StockComparisonSchema = z.object({
  symbol: z.string(),
  baseline: z.enum(["available", "missing"]),
  previousCapturedAt: timestamp.nullable(),
  priceChangePct: number,
  metricChanges: z.array(z.object({ metric: z.enum(metricKeys), before: z.number().finite(), after: z.number().finite() })),
  ruleChanges: z.array(z.object({ name: z.string(), before: z.boolean(), after: z.boolean() })),
  warnings: z.array(z.string()),
});
export const ComparisonResultSchema = z.array(StockComparisonSchema).max(100);
export type StockComparison = z.infer<typeof StockComparisonSchema>;

function newer(current: string | null, previous: string | null): boolean {
  return Boolean(current && previous && Date.parse(current) > Date.parse(previous));
}

/** 이전 LLM 문장이 아닌 저장된 수치로만 변화량을 계산한다. */
export function compareBriefingSnapshots(input: ComparisonInput): StockComparison[] {
  return input.current.map((current) => {
    const previous = input.previous.find((row) => row.symbol === current.symbol);
    const warnings: string[] = [];
    const result: StockComparison = {
      symbol: current.symbol, baseline: previous ? "available" : "missing",
      previousCapturedAt: previous?.capturedAt ?? null, priceChangePct: null, metricChanges: [], ruleChanges: [], warnings,
    };
    if (current.isMock) warnings.push("모의 시세 포함: 실제 시장 변화로 해석하지 마세요.");
    if (!current.quoteAt || current.price === null) warnings.push("현재 시세 또는 시세 기준 시각이 없습니다.");
    else if (Date.parse(current.capturedAt) - Date.parse(current.quoteAt) > 72 * 60 * 60 * 1_000) warnings.push("시세 기준 시각이 수집 시각보다 72시간 이상 오래됐습니다.");
    if (!current.fundamentalsAt) warnings.push("재무 기준 시각이 없습니다.");
    if (current.rules.some((rule) => rule.passed === null)) warnings.push("자료 부족으로 평가할 수 없는 룰이 있습니다.");
    if (!previous) {
      warnings.push("이전 수치 스냅샷 없음: 이번 데이터를 비교 기준으로 저장합니다. 변화 없음으로 단정하지 마세요.");
      return result;
    }
    if (!current.isMock && !previous.isMock && newer(current.quoteAt, previous.quoteAt) && previous.price !== null && previous.price > 0 && current.price !== null) {
      const delta = ((current.price - previous.price) / previous.price) * 100;
      if (Number.isFinite(delta)) result.priceChangePct = delta;
    } else warnings.push("시세 변화 비교 불가: 양쪽 실데이터와 더 최신인 시세가 필요합니다.");
    if (newer(current.fundamentalsAt, previous.fundamentalsAt)) {
      for (const metric of metricKeys) {
        const before = previous.metrics[metric];
        const after = current.metrics[metric];
        if (before !== null && after !== null && before !== after) result.metricChanges.push({ metric, before, after });
        else if ((before === null) !== (after === null)) warnings.push(`${metric}: 자료 유무가 바뀌어 수치 변화 비교에서 제외했습니다.`);
      }
    } else warnings.push("재무 자료가 갱신되지 않았거나 기준 시각이 없어 재무 변화 비교를 보류합니다.");
    for (const rule of current.rules) {
      if (current.rules.filter((item) => item.name === rule.name).length > 1 || previous.rules.filter((item) => item.name === rule.name).length > 1) {
        warnings.push(`${rule.name}: 같은 이름의 룰이 여러 개여서 비교에서 제외했습니다.`);
        continue;
      }
      const before = previous.rules.find((item) => item.name === rule.name);
      if (!before) continue;
      if (before.definition !== rule.definition) warnings.push(`${rule.name}: 룰 조건이 바뀌어 진입·이탈 비교에서 제외했습니다.`);
      else if (newer(current.fundamentalsAt, previous.fundamentalsAt) && before.passed !== null && rule.passed !== null && before.passed !== rule.passed) result.ruleChanges.push({ name: rule.name, before: before.passed, after: rule.passed });
    }
    return result;
  });
}
