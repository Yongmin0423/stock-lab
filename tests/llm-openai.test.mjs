import assert from "node:assert/strict";
import { llmJson } from "../src/lib/ai/llm.ts";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const requests = [];
let response;

try {
  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-only";
  delete process.env.OPENAI_MODEL_BRIEFING;
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json(response);
  };

  const opts = { system: "test", user: "test", schemaName: "test", schema: {}, tier: "briefing", maxTokens: 3000 };
  response = {
    choices: [{ finish_reason: "length", message: { content: "" } }],
    usage: { completion_tokens: 3000, completion_tokens_details: { reasoning_tokens: 3000 } },
  };
  await assert.rejects(llmJson(opts), /토큰 한도 초과 .*finish_reason=length, completion_tokens=3000, reasoning_tokens=3000/);
  assert.equal(requests.at(-1).max_completion_tokens, 12000);
  assert.equal(requests.at(-1).reasoning_effort, "low");

  // 잘린 JSON이 우연히 파싱되더라도 완성된 결과로 취급하지 않는다.
  response.choices[0].message.content = '{}';
  await assert.rejects(llmJson(opts), /토큰 한도 초과/);

  response = { choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }] };
  assert.deepEqual(await llmJson(opts), { ok: true });
  await llmJson({ ...opts, maxTokens: 16000 });
  assert.equal(requests.at(-1).max_completion_tokens, 16000);

  for (const tier of ["smart", "fast"]) {
    await llmJson({ ...opts, tier });
    assert.equal(requests.at(-1).max_completion_tokens, 3000);
    assert.equal(requests.at(-1).reasoning_effort, undefined);
  }

  process.env.OPENAI_MODEL_BRIEFING = "gpt-4o-mini";
  await llmJson(opts);
  assert.equal(requests.at(-1).max_completion_tokens, 3000);
  assert.equal(requests.at(-1).reasoning_effort, undefined);

  response = { choices: [{ finish_reason: "stop", message: { content: " " } }] };
  await assert.rejects(llmJson(opts), /응답이 비어 있습니다 .*finish_reason=stop/);
  response = { error: { message: "request failed" } };
  globalThis.fetch = async () => Response.json(response, { status: 429 });
  await assert.rejects(llmJson(opts), /OpenAI 429: request failed/);
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}
