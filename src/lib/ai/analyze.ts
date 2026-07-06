import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { NoteRow } from "@/lib/db/queries/notes";
import type { RuleResult } from "@/lib/rules";

export const AnalysisSchema = z.object({
  verdict: z.enum(["매수검토", "관망", "회피"]),
  confidence: z.number().min(1).max(5),
  reasons: z.array(z.string()),
  cited_notes: z.array(z.string()),
  risks: z.array(z.string()),
  challenges: z.array(z.string()),
});
export type AnalysisResult = z.infer<typeof AnalysisSchema>;

export interface AnalysisContext {
  stock: { symbol: string; name: string };
  quote: { price: number; changePct: number } | null;
  fundamentals: Record<string, number | null | Date | string> | null;
  ruleResults: RuleResult[];
  newsHeadlines: Array<{ headline: string; source: string | null }>;
  notes: NoteRow[];
}

export function hasAiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** 키가 없을 때: 룰 평가 기반 모의 분석 (DB 저장 안 함, UI 흐름 테스트용) */
export function mockAnalysis(ctx: AnalysisContext): AnalysisResult {
  const passed = ctx.ruleResults.filter((r) => r.passed);
  const verdict = passed.length === ctx.ruleResults.length && ctx.ruleResults.length > 0
    ? "매수검토"
    : passed.length > 0
      ? "관망"
      : "회피";
  return {
    verdict,
    confidence: 2,
    reasons: [
      `[모의] 스크리닝 룰 ${ctx.ruleResults.length}개 중 ${passed.length}개 통과 (${passed.map((r) => r.name).join(", ") || "없음"})`,
      ...ctx.ruleResults.flatMap((r) =>
        r.details.filter((d) => !d.passed).map((d) => `[모의] ${r.name}: ${d.label} ${d.value ?? "—"} (기준 ${d.target}) 미충족`),
      ),
    ].slice(0, 4),
    cited_notes: ctx.notes.slice(0, 2).map((n) => `note-${n.id}`),
    risks: ["[모의] ANTHROPIC_API_KEY를 설정하면 뉴스·노트를 반영한 실제 분석이 제공됩니다."],
    challenges: [],
  };
}

export async function runAnalysis(ctx: AnalysisContext): Promise<AnalysisResult> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY 자동 사용

  const notesBlock = ctx.notes.length
    ? ctx.notes.map((n) => `[note-${n.id}] ${n.title}\n${n.content}`).join("\n\n")
    : "(등록된 원칙 없음 — 일반적 기준으로 분석하되 reasons에 그 사실을 명시하라)";

  const system = `너는 나의 투자 스터디 파트너다. 아래 "나의 투자 원칙"을 최우선 판단 기준으로 삼아라.
원칙과 데이터가 충돌하면 명시적으로 지적하라.
나의 원칙이 검증된 투자 지식과 상충하거나 오해·과잉일반화로 보이면,
verdict은 원칙대로 내리되 challenges에 근거와 함께 이의를 제기하라. 문제가 없으면 challenges는 빈 배열.
제공된 데이터에 없는 수치를 만들어내지 마라. 노트 인용 시 반드시 [note-ID] 형식을 지켜라.
이것은 확정적 투자 조언이 아닌 학습용 분석이다. 한국어로 답하라.

## 나의 투자 원칙
${notesBlock}`;

  const user = `## 종목: ${ctx.stock.name} (${ctx.stock.symbol})
${ctx.quote ? `현재가 ${ctx.quote.price} (${ctx.quote.changePct}%)` : "시세 없음"}

## 재무 지표
${JSON.stringify(ctx.fundamentals ?? {}, null, 0)}

## 스크리닝 룰 평가 결과
${JSON.stringify(ctx.ruleResults, null, 0)}

## 최근 뉴스 헤드라인
${ctx.newsHeadlines.map((n) => `- ${n.headline} (${n.source ?? ""})`).join("\n") || "(없음)"}

위 데이터를 나의 원칙으로 평가해 submit_analysis 도구로 제출하라.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
    tools: [
      {
        name: "submit_analysis",
        description: "종목 분석 결과 제출",
        input_schema: {
          type: "object" as const,
          properties: {
            verdict: { type: "string", enum: ["매수검토", "관망", "회피"] },
            confidence: { type: "integer", minimum: 1, maximum: 5 },
            reasons: { type: "array", items: { type: "string" }, description: "판단 근거 3~5개" },
            cited_notes: { type: "array", items: { type: "string" }, description: "인용한 노트 ID들 (note-N 형식)" },
            risks: { type: "array", items: { type: "string" } },
            challenges: {
              type: "array",
              items: { type: "string" },
              description: "사용자의 원칙 자체에 대한 반론. 없으면 빈 배열",
            },
          },
          required: ["verdict", "confidence", "reasons", "cited_notes", "risks", "challenges"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_analysis" }, // JSON 강제 — 파싱 실패 원천 차단
  });

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI 응답에 분석 결과가 없습니다");
  return AnalysisSchema.parse(toolUse.input);
}
