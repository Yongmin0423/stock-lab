import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { createSessionToken } from "../src/lib/auth.ts";

// 빌드된 앱을 실제 HTTP로 검사한다. 외부 데이터·LLM 키 없이 로컬에서만 실행한다.
const port = 3217;
const origin = `http://127.0.0.1:${port}`;
const secret = "test-only-operator-secret";
const configured = !process.argv.includes("--without-auth");
const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", ...(configured ? { AUTH_PASSWORD: "test-only", AUTH_SECRET: secret } : {}) };
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: "ignore" });
let serverError;
server.on("error", (error) => { serverError = error; });

async function request(path, options = {}) {
  return fetch(`${origin}${path}`, { redirect: "manual", ...options });
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw new Error("검증 서버 시작 실패");
    try {
      if ((await request("/login")).status === 200) { ready = true; break; }
    } catch { /* 서버 시작 대기 */ }
    await setTimeout(250);
  }
  assert.equal(ready, true, "검증 서버 시작");
  for (const path of ["/", "/briefing", "/discover", "/news", "/stocks", "/notes", "/notes/1"]) {
    const response = await request(path);
    assert.equal(response.status, 200, `공개 조회: ${path}`);
    assert.equal(response.headers.has("location"), false, path);
  }
  for (const path of ["analyze", "ask-market", "briefing", "discover", "review-note", "note-to-rule", "refresh-news", "refresh-quotes"]) {
    const response = await request(`/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(response.status, 401, path);
    assert.match((await response.json()).error, /로그인/);
  }
  for (const path of ["/api/export-notes", "/api/search", "/api/cron/briefing", "/api/cron/refresh-screening"]) {
    assert.equal((await request(path)).status, 401, path);
  }
  for (const path of ["/settings", "/notes/new"]) {
    const response = await request(path);
    assert.equal(response.status, 307, path);
    assert.equal(new URL(response.headers.get("location"), origin).pathname, "/login", path);
  }

  const token = await createSessionToken(secret, Date.now() + 60_000);
  const headers = { Cookie: `stocklab_session=${token}`, "Content-Type": "application/json" };
  assert.equal((await request("/api/analyze", { method: "POST", headers, body: "{}" })).status, configured ? 400 : 401, "인증 설정이 있을 때만 유효 세션 허용");
  assert.equal((await request("/api/ask-market", { method: "POST", headers, body: "{}" })).status, configured ? 400 : 401);
  assert.equal((await request("/api/export-notes", { headers: { Cookie: "stocklab_session=forged" } })).status, 401);
  assert.equal((await request("/api/cron/briefing", { headers })).status, 401, "운영자 쿠키로 Cron 실행 불가");

  if (configured) {
    const html = await (await request("/login")).text();
    const actionName = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
    assert.ok(actionName, "로그인 서버 액션 폼");
    const form = new FormData();
    form.set(actionName, "");
    form.set("password", "test-only");
    const login = await request("/login", { method: "POST", headers: { Origin: origin }, body: form });
    assert.equal(login.status, 303);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /stocklab_session=/);
    assert.match(cookie, /httponly/i);
    const authenticated = { Cookie: cookie.split(";")[0] };
    const dashboard = await (await request("/", { headers: authenticated })).text();
    assert.match(dashboard, /로그아웃/);
    const logoutAction = dashboard.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
    assert.ok(logoutAction, "로그아웃 서버 액션 폼");
    const logoutForm = new FormData();
    logoutForm.set(logoutAction, "");
    const logout = await request("/", { method: "POST", headers: { ...authenticated, Origin: origin }, body: logoutForm });
    assert.equal(logout.status, 303);
    assert.match(logout.headers.get("set-cookie"), /stocklab_session=;/);
  }
} finally {
  server.kill("SIGTERM");
}
