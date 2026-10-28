import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const origin = "http://127.0.0.1:3218";
const canonicalOrigin = "https://stock-lab-ndgw.vercel.app";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3218"], {
  env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", DATABASE_URL: "", SITE_URL: canonicalOrigin, AUTH_PASSWORD: "test-only", AUTH_SECRET: "test-only-secret" },
  stdio: "ignore",
});
async function request(path, bot = false) {
  return fetch(`${origin}${path}`, { redirect: "manual", headers: bot ? { "User-Agent": "Twitterbot" } : {} });
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error("SEO test server exited");
    try { if ((await request("/robots.txt")).ok) { ready = true; break; } } catch { /* 서버 시작 대기 */ }
    await setTimeout(250);
  }
  assert.ok(ready);
  const robots = await (await request("/robots.txt")).text();
  assert.ok(robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
  const sitemap = await request("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.ok(xml.includes(`<loc>${canonicalOrigin}/stocks</loc>`));
  assert.ok(!xml.includes("/login") && !xml.includes("/settings") && !xml.includes("/notes/new"));
  for (const path of ["/", "/stocks", "/news", "/notes", "/briefing", "/discover"]) {
    const response = await request(path, true);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    if (path === "/") {
      assert.match(html, /name="google-site-verification" content="[^"]+"/);
      assert.match(html, /<h1[^>]*>주식갈피<\/h1>/);
      assert.ok(html.includes("한국·미국 주식 공부를 위한"));
      const website = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
      assert.equal(website["@type"], "WebSite");
      assert.equal(website.name, "주식갈피");
      assert.equal(website.url, `${canonicalOrigin}/`);
    }
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical, path);
    assert.equal(new URL(canonical).href, new URL(path, canonicalOrigin).href, path);
  }
  const page2 = await (await request("/stocks?page=2", true)).text();
  assert.ok(page2.includes(`rel="canonical" href="${canonicalOrigin}/stocks?page=2"`));
  const filtered = await (await request("/stocks?q=test", true)).text();
  assert.match(filtered, /name="robots" content="noindex, follow"/);
  const missing = await request("/stock/US%3AMISSING", true);
  // Cache Components가 먼저 셸을 스트리밍하면 notFound 응답도 200일 수 있다.
  assert.ok([200, 404].includes(missing.status));
  assert.match(await missing.text(), /name="robots" content="noindex"/);
  assert.match(await (await request("/login", true)).text(), /name="robots" content="noindex, nofollow"/);
  console.log("SEO HTTP checks passed (no database)");
} finally {
  server.kill("SIGTERM");
}
