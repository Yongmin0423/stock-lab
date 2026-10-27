import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/clarity.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const stored = new Map();
function setup(projectId) {
  const scripts = new Map();
  const window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
    },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, window, Event,
    process: { env: { NODE_ENV: "production", NEXT_PUBLIC_CLARITY_PROJECT_ID: projectId } },
    document: {
      getElementById: (id) => scripts.get(id),
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.set(script.id, script) },
    },
  });
  return { api: exports, window, scripts };
}
const { api, window, scripts } = setup();
assert.equal(api.readClarityConsent(), null);
api.syncClarityConsent(null);
api.syncClarityConsent("denied");
assert.equal(scripts.size, 0, "No Clarity request before consent or after rejection");
assert.equal(window.clarity, undefined);
let notifications = 0;
const unsubscribe = api.subscribeClarityConsent(() => notifications++);
api.saveClarityConsent("granted");
assert.equal(api.readClarityConsent(), "granted");
assert.equal(notifications, 1);
api.syncClarityConsent(api.readClarityConsent());
assert.equal(scripts.size, 1);
assert.equal(scripts.get("clarity-analytics").src, "https://www.clarity.ms/tag/z45hin4a0v");
assert.equal(scripts.get("clarity-analytics").async, true);
const calls = JSON.parse(JSON.stringify(window.clarity.q));
assert.deepEqual(calls[0], ["consentv2", { ad_Storage: "denied", analytics_Storage: "granted" }]);
api.syncClarityConsent("granted");
assert.equal(window.clarity.q.length, 2, "Repeated initialization must not duplicate tracking");
window.clarity = Object.assign((...args) => calls.push(args), { v: "test" });
api.saveClarityConsent("denied");
api.syncClarityConsent(api.readClarityConsent());
assert.deepEqual(JSON.parse(JSON.stringify(calls.slice(-2))), [
  ["consentv2", { ad_Storage: "denied", analytics_Storage: "denied" }], ["stop"],
]);
api.syncClarityConsent("granted");
assert.equal(scripts.size, 1, "Re-enabling must reuse the script");
assert.deepEqual(calls.at(-3), ["start"]);
assert.equal(setup().api.readClarityConsent(), "denied", "A new page must restore the saved choice");
window.dispatchEvent(Object.assign(new Event("storage"), { key: api.CLARITY_CONSENT_KEY }));
assert.equal(notifications, 3);
window.dispatchEvent(Object.assign(new Event("storage"), { key: "unrelated" }));
assert.equal(notifications, 3);
unsubscribe();
api.saveClarityConsent("granted");
assert.equal(notifications, 3);
window.localStorage.getItem = () => { throw new Error("storage blocked"); };
window.localStorage.setItem = () => { throw new Error("storage blocked"); };
api.saveClarityConsent("denied");
assert.equal(api.readClarityConsent(), "denied", "Storage restrictions must not discard the current choice");
const invalid = setup("</script><script>alert(1)</script>");
invalid.api.syncClarityConsent("granted");
assert.equal(invalid.scripts.size, 0);
console.log("Clarity consent, restore, revoke and restart checks passed");
