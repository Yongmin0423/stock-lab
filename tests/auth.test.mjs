import assert from "node:assert/strict";
import { createSessionToken, verifySessionToken, verifyPassword, requiresOperator, verifyCronAuthorization } from "../src/lib/auth.ts";
import { notePreview } from "../src/lib/note-preview.ts";

const secret = "test-only-session-secret";
const token = await createSessionToken(secret, Date.now() + 60_000);
assert.equal(await verifySessionToken(token, secret), true);
assert.equal(await verifySessionToken(token, "other-secret"), false);
assert.equal(await verifySessionToken(undefined, secret), false);
assert.equal(await verifySessionToken(`${token}.extra`, secret), false);
assert.equal(await verifySessionToken(`0.${token.split(".")[1]}`, secret), false);
assert.equal(await verifySessionToken(await createSessionToken(secret, Date.now() - 1), secret), false);
assert.equal(await verifyPassword("password", "password"), true);
assert.equal(await verifyPassword("wrong", "password"), false);

for (const path of ["/", "/briefing", "/discover", "/news", "/stocks", "/stock/US%3AAAPL", "/notes", "/notes/12", "/sitemap.xml", "/robots.txt", "/api/candles"]) {
  assert.equal(requiresOperator(path, "GET"), false, path);
  assert.equal(requiresOperator(path, "POST"), true, path);
}
for (const path of ["/settings", "/notes/new", "/api/export-notes", "/api/search", "/api/ask-market", "/api/briefing", "/api/new-ai-feature", "/new-admin-page"]) {
  assert.equal(requiresOperator(path, "GET"), true, path);
  assert.equal(requiresOperator(path, "POST"), true, path);
}
assert.equal(requiresOperator("/login", "POST"), false);
assert.equal(verifyCronAuthorization(null, undefined), false);
assert.equal(verifyCronAuthorization("Bearer undefined", undefined), false);
assert.equal(verifyCronAuthorization("Bearer wrong", secret), false);
assert.equal(verifyCronAuthorization(`Bearer ${secret}`, secret), true);

const privateText = "공개".repeat(80) + "절대로 공개하면 안 되는 본문";
assert.equal(notePreview(privateText), "공개".repeat(80) + "…");
assert.equal(notePreview("짧은 노트"), "짧은 노트");
