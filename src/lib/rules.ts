// 룰은 DB(rules 테이블)에서 관리 — /settings에서 편집.
// 최초 실행 시 config/rules.json의 기본 룰이 자동 시드됩니다.

type Op = "<" | ">" | "<=" | ">=";
const ops: Record<Op, (a: number, b: number) => boolean> = {
  "<": (a, b) => a < b,
  ">": (a, b) => a > b,
  "<=": (a, b) => a <= b,
  ">=": (a, b) => a >= b,
};

export const METRIC_LABELS: Record<string, string> = {
  per: "PER",
  pbr: "PBR",
  eps: "EPS",
  roe: "ROE",
  debtToEquity: "부채비율",
  dividendYield: "배당수익률",
};

export const OPS: Op[] = ["<", "<=", ">", ">="];

export interface RuleCondition {
  metric: string;
  op: string;
  value: number;
}

export interface RuleDetail {
  metric: string;
  label: string;
  value: number | null;
  target: string;
  passed: boolean;
}

export interface RuleResult {
  name: string;
  passed: boolean;
  details: RuleDetail[];
}

type MetricSource = Partial<Record<string, number | null>>;

export function evaluateRules(
  f: MetricSource,
  ruleDefs: Array<{ name: string; definition: RuleCondition[] }>,
): RuleResult[] {
  return ruleDefs.map((rule) => {
    const details: RuleDetail[] = rule.definition.map((r) => {
      const value = f[r.metric] ?? null;
      const passed = value != null && Number.isFinite(value) && ops[r.op as Op](value, r.value);
      return {
        metric: r.metric,
        label: METRIC_LABELS[r.metric] ?? r.metric,
        value,
        target: `${r.op} ${r.value}`,
        passed,
      };
    });
    return { name: rule.name, passed: details.length > 0 && details.every((d) => d.passed), details };
  });
}
