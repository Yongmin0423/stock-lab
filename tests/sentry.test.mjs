import assert from "node:assert/strict";
import { scrubSentryError, scrubSentrySpan } from "../src/lib/sentry-options.ts";

const event = scrubSentryError({
  request: { method: "POST", url: "https://stocks.example/api/briefing?token=private#secret", headers: { authorization: "Bearer private" }, cookies: { session: "private" }, data: { note: "private note" } },
  user: { email: "private@example.com" },
  extra: { note: "private note" },
  breadcrumbs: [{ message: "private input" }],
  exception: { values: [{ type: "Error", value: "briefing failed" }] },
});
assert.deepEqual(event.request, { method: "POST", url: "https://stocks.example/api/briefing" });
assert.equal(event.user, undefined);
assert.equal(event.extra, undefined);
assert.equal(event.breadcrumbs, undefined);
assert.equal(event.exception.values[0].value, "briefing failed");

const span = { name: "GET https://api.example/quote?token=private", attributes: { "sentry.op": "http.client", "http.url": "https://api.example?token=private", "gen_ai.prompt": "private note" }, links: [{ attributes: { secret: "private" } }] };
const scrubbed = scrubSentrySpan(span);
assert.equal(scrubbed.name, "GET https://api.example/quote");
assert.deepEqual(scrubbed.attributes, { "sentry.op": "http.client" });
assert.equal(scrubbed.links, undefined);
assert.equal(scrubSentrySpan({ ...span, name: "SELECT private note", attributes: { "sentry.op": "db.query" } }).name, "db.query");
console.log("Sentry privacy checks passed");
