import { StockComparisonSchema } from "@/lib/research/briefing-comparison";
import { METRIC_LABELS } from "@/lib/rules";

export function BriefingComparison({ value }: { value: unknown }) {
  const parsed = StockComparisonSchema.safeParse(value);
  if (!parsed.success) return null;
  const comparison = parsed.data;
  return (
    <details className="mt-2 text-xs text-[var(--text-faint)]">
      <summary className="cursor-pointer">수치 비교·자료 상태 · {comparison.baseline === "missing" ? "첫 기준선" : "직전 기록 대비"}</summary>
      <div className="mt-2 space-y-1">
        {comparison.previousCapturedAt && <p>비교 기준: {new Date(comparison.previousCapturedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>}
        {comparison.priceChangePct !== null && <p>직전 시세 대비 {comparison.priceChangePct >= 0 ? "+" : ""}{comparison.priceChangePct.toFixed(2)}% (당일 등락률과 별도)</p>}
        {comparison.metricChanges.map((change) => <p key={change.metric}>{METRIC_LABELS[change.metric]}: {change.before} → {change.after}</p>)}
        {comparison.ruleChanges.map((change) => <p key={change.name}>룰 {change.name}: {change.before ? "통과" : "미통과"} → {change.after ? "통과" : "미통과"}</p>)}
        {comparison.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
      </div>
    </details>
  );
}
