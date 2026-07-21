/**
 * LLM 공용 레이어 — Anthropic / OpenAI 중 키가 있는 쪽을 사용.
 * 둘 다 있으면 AI_PROVIDER(anthropic|openai)로 선택 (기본: anthropic).
 *
 * 모든 AI 기능(분석·검토·브리핑·발굴·노트→룰·뉴스평가)이 이 파일의 llmJson()을 통과한다.
 * - Anthropic: tool use 강제로 JSON 보장
 * - OpenAI: response_format json_object + 스키마 프롬프트 주입 (결과는 호출부의 zod가 검증)
 */

export type LlmTier = "smart" | "fast" | "briefing";

export function aiProvider(): "anthropic" | "openai" | null {
  const pref = process.env.AI_PROVIDER;
  if (pref === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (pref === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function hasAiKey(): boolean {
  return aiProvider() !== null;
}

export interface LlmJsonOptions {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>; // JSON Schema (object)
  maxTokens?: number;
  tier?: LlmTier; // smart=일반 분석, fast=경량 작업, briefing=브리핑 전용
  timeoutMs?: number;
}

export async function llmJson(opts: LlmJsonOptions): Promise<unknown> {
  const provider = aiProvider();
  if (!provider) throw new Error("AI 키 미설정 (ANTHROPIC_API_KEY 또는 OPENAI_API_KEY)");
  return provider === "anthropic" ? anthropicJson(opts) : openaiJson(opts);
}

async function anthropicJson({ system, user, schemaName, schema, maxTokens = 2000, tier = "smart", timeoutMs }: LlmJsonOptions) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();
  const model =
    tier === "fast"
      ? (process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001")
      : tier === "briefing"
        ? (process.env.ANTHROPIC_MODEL_BRIEFING ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5")
        : (process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5");

  const msg = await client.messages.create(
    {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      tools: [
        {
          name: schemaName,
          description: `${schemaName} 결과 제출`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          input_schema: schema as any,
        },
      ],
      tool_choice: { type: "tool", name: schemaName },
    },
    timeoutMs ? { timeout: timeoutMs, maxRetries: 0 } : undefined,
  );

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI 응답에 결과가 없습니다");
  return toolUse.input;
}

async function openaiJson({ system, user, schemaName, schema, maxTokens = 2000, tier = "smart", timeoutMs }: LlmJsonOptions) {
  const model =
    tier === "fast"
      ? (process.env.OPENAI_MODEL_FAST ?? "gpt-4o-mini")
      : tier === "briefing"
        ? (process.env.OPENAI_MODEL_BRIEFING ?? "gpt-5.6-terra")
        : (process.env.OPENAI_MODEL ?? "gpt-5.6-terra");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${system}\n\n출력 규칙: 아래 JSON 스키마("${schemaName}")를 따르는 JSON 객체 하나만 출력하라. 설명·마크다운·코드블록 금지.\n${JSON.stringify(schema)}`,
        },
        { role: "user", content: user },
      ],
    }),
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  });

  const d = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${d.error?.message ?? "요청 실패"}`);
  const content = d.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI 응답이 비어 있습니다");
  return JSON.parse(content);
}
