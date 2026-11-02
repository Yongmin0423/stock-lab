import assert from "node:assert/strict";
import { compareBriefingSnapshots, ComparisonInputSchema } from "../src/lib/research/briefing-comparison.ts";
import { readBriefingSnapshots } from "../src/lib/briefing-snapshot.ts";
import { runBriefing } from "../src/lib/ai/briefing.ts";
import worker from "../workers/research/src/index.ts";
import { createComparisonHeaders } from "../src/lib/research/protocol.ts";
import { compareBriefingOnWorker } from "../src/lib/research/client.ts";

const previous = {
  version: 1, symbol: "US:AAPL", capturedAt: "2026-10-30T10:00:00.000Z",
  price: 100, quoteAt: "2026-10-30T09:00:00.000Z", isMock: false,
  fundamentalsAt: "2026-10-30T09:00:00.000Z",
  metrics: { per: 20, pbr: null, eps: 5, roe: 10, debtToEquity: 100, dividendYield: 1 },
  rules: [{ name: "PER", definition: "per < 18", passed: false }],
};
const current = {
  ...structuredClone(previous), capturedAt: "2026-11-02T10:00:00.000Z", quoteAt: "2026-11-02T09:00:00.000Z",
  fundamentalsAt: "2026-11-02T09:00:00.000Z", price: 110,
  metrics: { ...previous.metrics, per: 17, pbr: 2 }, rules: [{ ...previous.rules[0], passed: true }],
};
const input = { current: [current], previous: [previous] };
const [delta] = compareBriefingSnapshots(input);
assert.ok(Math.abs(delta.priceChangePct - 10) < 0.000001);
assert.deepEqual(delta.metricChanges, [{ metric: "per", before: 20, after: 17 }]);
assert.deepEqual(delta.ruleChanges, [{ name: "PER", before: false, after: true }]);
assert.ok(delta.warnings.some((warning) => warning.includes("pbr")));
assert.equal(compareBriefingSnapshots({ current: [current], previous: [] })[0].baseline, "missing");
assert.deepEqual(readBriefingSnapshots([{ symbol: current.symbol, summary: "legacy" }]), []);
assert.deepEqual(readBriefingSnapshots([{ symbol: "other", snapshot: current }]), []);
assert.deepEqual(readBriefingSnapshots([{ symbol: current.symbol, snapshot: current }]), [current]);
assert.equal(ComparisonInputSchema.safeParse({ current: [current, current], previous: [] }).success, false);
const [stale] = compareBriefingSnapshots({ current: [{ ...current, quoteAt: previous.quoteAt, fundamentalsAt: previous.fundamentalsAt }], previous: [previous] });
assert.equal(stale.priceChangePct, null);
assert.deepEqual(stale.metricChanges, []);
assert.deepEqual(stale.ruleChanges, []);
assert.equal(compareBriefingSnapshots({ current: [{ ...current, isMock: true }], previous: [previous] })[0].priceChangePct, null);
assert.deepEqual(compareBriefingSnapshots({ current: [{ ...current, rules: [{ ...current.rules[0], definition: "per < 30" }] }], previous: [previous] })[0].ruleChanges, []);
assert.deepEqual(compareBriefingSnapshots({ current: [{ ...current, rules: [{ ...current.rules[0], passed: null }] }], previous: [previous] })[0].ruleChanges, []);

const secret = "test-only-comparison-secret-more-than-32-characters";
const requestId = crypto.randomUUID();
const body = JSON.stringify(input);
const headers = await createComparisonHeaders(secret, requestId, body);
const request = (value = body) => new Request("https://worker.example/briefing/compare", { method: "POST", headers, body: value });
assert.equal((await worker.fetch(request(), { RESEARCH_WORKER_SECRET: secret })).status, 200);
assert.equal((await worker.fetch(request(body.replace('"price":110', '"price":120')), { RESEARCH_WORKER_SECRET: secret })).status, 401);
const invalidBody = JSON.stringify({ current: [{}], previous: [] });
assert.equal((await worker.fetch(new Request("https://worker.example/briefing/compare", { method: "POST", body: invalidBody, headers: await createComparisonHeaders(secret, requestId, invalidBody) }), { RESEARCH_WORKER_SECRET: secret })).status, 400);

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
try {
  process.env.RESEARCH_WORKER_URL = "https://worker.example";
  process.env.RESEARCH_WORKER_SECRET = secret;
  globalThis.fetch = (url, options) => worker.fetch(new Request(url, options), { RESEARCH_WORKER_SECRET: secret });
  assert.deepEqual(await compareBriefingOnWorker(input), [delta]);
  const stock = { symbol: "US:AAPL", name: "Apple", price: 110, changePct: -2, quoteAt: new Date(current.quoteAt), isMock: false, fundamentals: null, ruleResults: [], latestAnalysis: null, news: [], relatedNotes: [] };
  const context = {
    slot: "morning", market: [], stocks: [stock], noteDigest: "", prevBriefingAt: new Date(previous.capturedAt), capturedAt: current.capturedAt,
    previousBriefing: { id: 1, createdAt: previous.capturedAt, marketSummary: "과거 요약", stockSections: [{ symbol: stock.symbol, summary: "다음 확인: 현금흐름" }], watchItems: [] }, comparisons: [delta],
  };
  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-only";
  let result = { market_summary: "요약", stock_sections: [{ symbol: stock.symbol, summary: "확인 불가" }], watch_items: [] };
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(options.body);
    assert.match(payload.messages[1].content, /다음 확인: 현금흐름/);
    assert.match(payload.messages[1].content, /priceChangePct/);
    assert.match(payload.messages[0].content, /비교 기준 없음/);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(result) } }] });
  };
  assert.equal((await runBriefing(context)).stock_sections[0].symbol, stock.symbol);
  result = { ...result, stock_sections: [{ symbol: "US:FAKE", summary: "wrong" }] };
  await assert.rejects(runBriefing(context), /종목 목록/);
  result = { ...result, stock_sections: [], watch_items: [] };
  await assert.rejects(runBriefing(context), /종목 목록/);
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}
console.log("Briefing: 스냅샷 비교·구기록 호환·본문 서명·Worker 왕복·과거 판단 입력·출력 검증 통과");
