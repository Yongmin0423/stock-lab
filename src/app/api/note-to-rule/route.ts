import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hasAiKey } from "@/lib/ai/analyze";
import { getDb } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { METRIC_LABELS } from "@/lib/rules";

const ProposalSchema = z.object({
  possible: z.boolean(),
  name: z.string(),
  conditions: z.array(
    z.object({
      metric: z.enum(["per", "pbr", "eps", "roe", "debtToEquity", "dividendYield"]),
      op: z.enum(["<", "<=", ">", ">="]),
      value: z.number(),
    }),
  ),
  note: z.string(), // 변환 시 유의점 (정성적 원칙 중 룰로 못 담은 부분)
});

export const maxDuration = 60;

/** 정성적 노트 → 정량적 스크리닝 룰 변환 제안 */
export async function POST(req: Request) {
  try {
    const { noteId } = (await req.json()) as { noteId?: number };
    if (!noteId) return NextResponse.json({ error: "noteId 필요" }, { status: 400 });

    const db = getDb();
    const note = await db.query.notes.findFirst({ where: eq(notes.id, noteId) });
    if (!note) return NextResponse.json({ error: "노트 없음" }, { status: 404 });

    if (!hasAiKey()) {
      return NextResponse.json({
        proposal: {
          possible: true,
          name: `[모의] ${note.title}`,
          conditions: [{ metric: "per", op: "<", value: 15 }],
          note: "[모의] ANTHROPIC_API_KEY 설정 시 노트 내용 기반 제안이 생성됩니다.",
        },
        isMock: true,
      });
    }

    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: `사용자의 투자 노트를 정량 스크리닝 룰로 변환하라.
사용 가능한 지표: ${Object.entries(METRIC_LABELS).map(([k, v]) => `${k}(${v})`).join(", ")}.
노트가 정량화 불가능한 내용이면 possible=false.
정성적 원칙 중 룰에 못 담은 부분은 note에 명시하라. 보수적으로 변환하라. 한국어.`,
      messages: [
        {
          role: "user",
          content: `## 노트\n제목: ${note.title}\n\n${note.content}\n\n이 노트를 룰로 변환해 submit_rule로 제출하라.`,
        },
      ],
      tools: [
        {
          name: "submit_rule",
          description: "룰 변환 제안 제출",
          input_schema: {
            type: "object" as const,
            properties: {
              possible: { type: "boolean" },
              name: { type: "string", description: "룰 이름 (노트 제목 기반, 간결하게)" },
              conditions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    metric: { type: "string", enum: ["per", "pbr", "eps", "roe", "debtToEquity", "dividendYield"] },
                    op: { type: "string", enum: ["<", "<=", ">", ">="] },
                    value: { type: "number" },
                  },
                  required: ["metric", "op", "value"],
                },
              },
              note: { type: "string" },
            },
            required: ["possible", "name", "conditions", "note"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_rule" },
    });

    const toolUse = msg.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI 응답 없음");
    return NextResponse.json({ proposal: ProposalSchema.parse(toolUse.input), isMock: false });
  } catch (e) {
    console.error("note-to-rule 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "변환 실패" }, { status: 500 });
  }
}
