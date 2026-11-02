import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { createSessionToken } from "../src/lib/auth.ts";

const origin = "http://127.0.0.1:3219";
const secret = crypto.randomUUID();
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3219"], {
  stdio: "ignore",
  env: {
    ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    AUTH_PASSWORD: "test-only", AUTH_SECRET: secret,
    DATABASE_URL: "", RESEARCH_WORKER_URL: "", RESEARCH_WORKER_SECRET: "",
  },
});
let serverError;
server.on("error", (error) => { serverError = error; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw new Error("Next.js 검증 서버 시작 실패");
    try {
      if ((await fetch(`${origin}/api/research/health`, { signal: AbortSignal.timeout(1_000) })).status === 401) { ready = true; break; }
    } catch { /* 프로덕션 서버 시작 대기 */ }
    await setTimeout(250);
  }
  assert.equal(ready, true);
  const forged = await fetch(`${origin}/api/research/health`, { headers: { Cookie: "stocklab_session=forged" } });
  assert.equal(forged.status, 401);
  const token = await createSessionToken(secret, Date.now() + 60_000);
  const headers = { Cookie: `stocklab_session=${token}` };
  const unconfigured = await fetch(`${origin}/api/research/health`, { headers });
  assert.equal(unconfigured.status, 503, "운영자만 설정 누락 상태 확인 가능");
  assert.equal(unconfigured.headers.get("cache-control"), "no-store");
  assert.match((await unconfigured.json()).error, /설정/);
  const settings = await fetch(`${origin}/settings`, { headers });
  assert.equal(settings.status, 200);
  assert.match(await settings.text(), /리서치 서버 연결/, "DB 없이도 연결 확인 영역 표시");
  console.log("Research Worker route: 비로그인·위조 세션 거부, 설정 누락, DB 없는 설정 화면 통과");
} finally {
  if (server.pid && server.exitCode === null) {
    const exited = new Promise((resolveExit) => server.once("exit", resolveExit));
    server.kill();
    await exited;
  }
}
