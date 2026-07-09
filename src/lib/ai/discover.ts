import { z } from "zod";
import { llmJson } from "./llm";
import type { NoteRow } from "@/lib/db/queries/notes";
import type { RuleResult } from "@/lib/rules";

export const DiscoverSchema = z.object({
  picks: z.array(
    z.object({
      symbol: z.string(),
      fit_score: z.number().min(1).max(5),
      reason: z.string(),
      cited: z.string(), // 어떤 노트/룰과 맞는지
      caution: z.string(),
    }),
  ),
});
export type DiscoverResult = z.infer<typeof DiscoverSchema>;

export interface DiscoverCandidate {
  symbol: string;
  name: string;
  fundamentals: Record<string, number | null | undefined>;
  ruleResults: RuleResult[];
  passedCount: number;
}

export function mockDiscover(candidates: DiscoverCandidate[]): DiscoverResult {
  return {
    picks: candidates.slice(0, 5).map((c) => ({
      symbol: c.symbol,
      fit_score: Math.min(5, c.passedCount + 2),
      reason: `[모의] 룰 ${c.passedCount}개 통과: ${c.ruleResults.filter((r) => r.passed).map((r) => r.name).join(", ")}`,
      cited: "룰 평가",
      caution: "[모의] ANTHROPIC_API_KEY 설정 시 노트 기반 적합도 평가가 실행됩니다.",
    })),
  };
}

/** 2단계: 룰 통과 후보들을 내 노트(원칙) 기준으로 적합도 평가 */
export async function runDiscover(candidates: DiscoverCandidate[], notes: NoteRow[]): Promise<DiscoverResult> {
  const system = `너는 나의 투자 원칙에 맞는 종목을 발굴하는 리서치 파트너다.
아래 후보들은 이미 정량 스크리닝 룰을 통과했다. 이제 "나의 투자 원칙"(노트) 관점에서 적합도를 평가하라.

원칙:
- 주가 예측이 아니다. "내 원칙과 얼마나 맞는가"의 평가다.
- cited에 어떤 노트([note-ID])나 룰과 맞는지 반드시 명시하라.
- caution에는 내 원칙 관점에서 주의할 점 한 가지를 적어라 (예: 사이클 정점 가능성).
- 원칙과 안 맞는 후보는 과감히 제외하라. picks는 최대 5개.
- 제공된 수치만 사용하라. 한국어.

## 나의 투자 원칙
${notes.length ? notes.map((n) => `[note-${n.id}] ${n.title}\n${n.content.slice(0, 300)}`).join("\n\n") : "(노트 없음 — 룰 평가만으로 판단)"}`;

  const user = `## 정량 스크리닝 통과 후보
${candidates
  .map(
    (c) =>
      `- ${c.name} (${c.symbol}): ${JSON.stringify(c.fundamentals)} / 통과 룰: ${c.ruleResults
        .filter((r) => r.passed)
        .map((r) => r.name)
        .join(", ")}`,
  )
  .join("\n")}

내 원칙 기준으로 적합도를 평가해 submit_picks 도구로 제출하라.`;

  const result = await llmJson({
    system,
    user,
    schemaName: "submit_picks",
    maxTokens: 2500,
    schema: {
      type: "object",
      properties: {
        picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              fit_score: { type: "integer", minimum: 1, maximum: 5 },
              reason: { type: "string" },
              cited: { type: "string" },
              caution: { type: "string" },
            },
            required: ["symbol", "fit_score", "reason", "cited", "caution"],
          },
        },
      },
      required: ["picks"],
    },
  });

  return DiscoverSchema.parse(result);
}
