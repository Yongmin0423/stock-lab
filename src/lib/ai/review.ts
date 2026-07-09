import { z } from "zod";
import { llmJson } from "./llm";
import type { NoteRow } from "@/lib/db/queries/notes";

export const ReviewSchema = z.object({
  factual_issues: z.array(z.string()),
  overgeneralizations: z.array(z.string()),
  counterexamples: z.array(z.string()),
  suggestions: z.array(z.string()),
  overall: z.string(),
});
export type ReviewResult = z.infer<typeof ReviewSchema>;

export function mockReview(): ReviewResult {
  return {
    factual_issues: [],
    overgeneralizations: [],
    counterexamples: [],
    suggestions: ["[모의] ANTHROPIC_API_KEY를 설정하면 실제 검토가 실행됩니다."],
    overall: "[모의] 검토 파이프라인이 정상 동작합니다. 키 설정 후 다시 실행하세요.",
  };
}

/** 노트 저장 후 "AI 검토": 사실 오류·과잉일반화·반례를 지적하는 스터디 파트너 */
export async function runReview(note: NoteRow): Promise<ReviewResult> {
  const system = `너는 투자 공부를 함께하는 비판적 스터디 파트너다.
사용자가 책·영상에서 배운 내용을 정리한 노트를 검토한다. 이 노트는 이후 AI 종목 분석의 판단 기준으로 쓰이므로,
잘못된 내용이 있으면 잘못된 투자 판단으로 이어진다. 엄격하되 건설적으로 검토하라.

검토 관점:
- factual_issues: 사실과 다른 서술 (틀린 개념 정의, 잘못된 공식 등)
- overgeneralizations: 특정 조건에서만 맞는 걸 일반화한 부분 (예: "PER이 낮으면 저평가" — 사이클 산업 예외)
- counterexamples: 이 원칙이 실패하는 대표적 반례·상황
- suggestions: 노트를 보완할 구체적 제안 (조건 명시, 예외 추가 등)
- overall: 한두 문장 총평

문제가 없는 항목은 빈 배열로. 억지로 트집 잡지 마라. 한국어로 답하라.`;

  const user = `## 검토할 노트
제목: ${note.title}
출처: ${note.source ?? "(미기재)"}
태그: ${note.tags.join(", ") || "(없음)"}

${note.content}

위 노트를 검토해 submit_review 도구로 제출하라.`;

  const result = await llmJson({
    system,
    user,
    schemaName: "submit_review",
    maxTokens: 1500,
    schema: {
      type: "object",
      properties: {
        factual_issues: { type: "array", items: { type: "string" } },
        overgeneralizations: { type: "array", items: { type: "string" } },
        counterexamples: { type: "array", items: { type: "string" } },
        suggestions: { type: "array", items: { type: "string" } },
        overall: { type: "string" },
      },
      required: ["factual_issues", "overgeneralizations", "counterexamples", "suggestions", "overall"],
    },
  });

  return ReviewSchema.parse(result);
}
