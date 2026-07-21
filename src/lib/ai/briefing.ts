import { z } from "zod";
import { llmJson } from "./llm";
import type { RuleResult } from "@/lib/rules";

export const BriefingSchema = z.object({
  market_summary: z.string(),
  stock_sections: z.array(
    z.object({
      symbol: z.string(),
      summary: z.string(),
    }),
  ),
  watch_items: z.array(
    z.object({
      symbol: z.string(),
      reason: z.string(),
      basis: z.string(),
    }),
  ),
});
export type BriefingResult = z.infer<typeof BriefingSchema>;

export interface BriefingStockInput {
  symbol: string;
  name: string;
  price: number | null;
  changePct: number | null;
  ruleResults: RuleResult[];
  latestAnalysis: { verdict: string; createdAt: Date; reasons: string[] } | null;
  headlines: string[];
}

export interface BriefingContext {
  slot: "morning" | "evening";
  stocks: BriefingStockInput[];
  noteDigest: string; // 내 원칙 요약 (큐레이션 기준)
  prevBriefingAt: Date | null;
}

const SLOT_ROLE: Record<string, string> = {
  morning: "아침 브리핑: 간밤 미국 장 결과와 미국 뉴스를 정리하고, 오늘 한국 장 관전 포인트를 예고하라.",
  evening: "저녁 브리핑: 오늘 한국 장 결과와 국내 뉴스·공시를 정리하고, 오늘 밤 미국 장 관전 포인트를 예고하라.",
};

export function mockBriefing(ctx: BriefingContext): BriefingResult {
  const movers = ctx.stocks.filter((s) => Math.abs(s.changePct ?? 0) >= 2);
  const rulePassed = ctx.stocks.filter((s) => s.ruleResults.some((r) => r.passed));
  return {
    market_summary: `[모의] watchlist ${ctx.stocks.length}종목 중 ±2% 이상 변동 ${movers.length}건. ANTHROPIC_API_KEY 설정 시 실제 브리핑이 생성됩니다.`,
    stock_sections: ctx.stocks.map((s) => ({
      symbol: s.symbol,
      summary: `[모의] ${s.changePct != null ? `등락 ${s.changePct}%` : "시세 없음"} · 뉴스 ${s.headlines.length}건 · ${
        s.latestAnalysis ? `최근 분석 ${s.latestAnalysis.verdict}` : "분석 이력 없음"
      }`,
    })),
    watch_items: rulePassed.slice(0, 3).map((s) => ({
      symbol: s.symbol,
      reason: `[모의] 룰 통과: ${s.ruleResults.filter((r) => r.passed).map((r) => r.name).join(", ")}`,
      basis: "룰 평가",
    })),
  };
}

export async function runBriefing(ctx: BriefingContext): Promise<BriefingResult> {
  const system = `너는 나만의 투자 리서치 브리핑을 작성하는 애널리스트다.
${SLOT_ROLE[ctx.slot]}

원칙:
- 델타 중심: ${ctx.prevBriefingAt ? `직전 브리핑(${ctx.prevBriefingAt.toISOString()}) 이후 새로 생긴 것` : "최근 변화"} 위주로. 변화 없는 종목은 "특이사항 없음" 한 줄로 짧게.
- 주가 예측 금지. watch_items는 예측이 아니라 "지금 왜 봐야 하는지"의 근거 있는 알림이다:
  룰 진입/이탈, 과거 분석의 판단 근거에 변화가 생긴 경우, 내 원칙(노트)과 연결된 뉴스 등.
- watch_items의 basis에는 근거 출처를 명시 (예: "룰: 저평가 우량주", "6/28 분석의 관망 사유", "노트: 안전마진").
- 제공된 데이터에 없는 수치를 만들지 마라. 사용자의 투자 원칙과 관련 깊은 정보를 우선하라.
- 확정적 투자 조언이 아닌 학습용 브리핑. 한국어. 간결하게.

## 사용자의 투자 원칙 (큐레이션 기준)
${ctx.noteDigest || "(등록된 원칙 없음)"}`;

  const user = `## Watchlist 현황
${ctx.stocks
  .map(
    (s) => `### ${s.name} (${s.symbol})
- 시세: ${s.price ?? "—"} (${s.changePct ?? "—"}%)
- 룰 평가: ${s.ruleResults.map((r) => `${r.name} ${r.passed ? "통과" : "미통과"}`).join(", ") || "룰 없음"}
- 최근 AI 분석: ${
      s.latestAnalysis
        ? `${s.latestAnalysis.verdict} (${s.latestAnalysis.createdAt.toISOString().slice(0, 10)}) — ${s.latestAnalysis.reasons[0] ?? ""}`
        : "없음"
    }
- 최근 뉴스: ${s.headlines.slice(0, 5).map((h) => `"${h}"`).join(" / ") || "없음"}`,
  )
  .join("\n\n")}

위 데이터로 브리핑을 작성해 submit_briefing 도구로 제출하라.`;

  const result = await llmJson({
    tier: "briefing",
    system,
    user,
    schemaName: "submit_briefing",
    maxTokens: 3000,
    schema: {
      type: "object",
      properties: {
        market_summary: { type: "string", description: "시장 전반 요약 2~4문장" },
        stock_sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              summary: { type: "string", description: "종목별 델타 요약. 변화 없으면 '특이사항 없음'" },
            },
            required: ["symbol", "summary"],
          },
        },
        watch_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              reason: { type: "string", description: "지금 왜 주목해야 하는지" },
              basis: { type: "string", description: "근거 출처 (룰/노트/과거 분석/이벤트)" },
            },
            required: ["symbol", "reason", "basis"],
          },
          description: "0~3개. 억지로 만들지 말 것",
        },
      },
      required: ["market_summary", "stock_sections", "watch_items"],
    },
  });

  return BriefingSchema.parse(result);
}
