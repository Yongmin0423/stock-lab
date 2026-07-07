import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const EvalSchema = z.object({
  evaluations: z.array(
    z.object({
      id: z.number(),
      sentiment: z.enum(["호재", "악재", "중립"]),
      importance: z.number().min(1).max(3),
      note: z.string(), // 내 원칙과의 관련성 (관련 없으면 빈 문자열)
    }),
  ),
});

/**
 * 뉴스 헤드라인 배치 평가 (Haiku — 20건에 몇 원 수준)
 * 호재/악재/중립 + 중요도(1~3) + 내 원칙과의 관련성 메모
 */
export async function evaluateNewsBatch(
  items: Array<{ id: number; headline: string }>,
  stockName: string,
  principlesDigest: string,
): Promise<Array<{ id: number; sentiment: "호재" | "악재" | "중립"; importance: number; note: string }>> {
  if (items.length === 0) return [];
  const client = new Anthropic();

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: `너는 ${stockName} 종목 뉴스 헤드라인을 평가하는 애널리스트다.
각 헤드라인에 대해:
- sentiment: 이 종목 주주 관점에서 호재/악재/중립
- importance: 1(사소)~3(실적·전략에 중대). 단순 시황 중계나 광고성은 1.
- note: 아래 "사용자의 투자 원칙"과 관련 있으면 한 줄로 연결점을, 없으면 빈 문자열.
헤드라인만으로 판단이 어려우면 중립/1로 보수적으로. 한국어.

## 사용자의 투자 원칙 (태그·제목)
${principlesDigest || "(없음)"}`,
    messages: [
      {
        role: "user",
        content: `${items.map((n) => `[id:${n.id}] ${n.headline}`).join("\n")}\n\n각 헤드라인을 평가해 submit_evaluations로 제출하라.`,
      },
    ],
    tools: [
      {
        name: "submit_evaluations",
        description: "뉴스 평가 제출",
        input_schema: {
          type: "object" as const,
          properties: {
            evaluations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  sentiment: { type: "string", enum: ["호재", "악재", "중립"] },
                  importance: { type: "integer", minimum: 1, maximum: 3 },
                  note: { type: "string" },
                },
                required: ["id", "sentiment", "importance", "note"],
              },
            },
          },
          required: ["evaluations"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_evaluations" },
  });

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];
  return EvalSchema.parse(toolUse.input).evaluations;
}
