import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/components/clarity-analytics.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});
const exports = {};
const env = { NODE_ENV: "production" };
runInNewContext(outputText, {
  exports,
  process: { env },
  require: (name) => name === "next/script" ? { default: "script" } : require(name),
});

const element = exports.ClarityAnalytics();
assert.equal(element.props.strategy, "afterInteractive");
const inserted = [];
const anchor = { parentNode: { insertBefore: (script) => inserted.push(script) } };
const window = {};
runInNewContext(element.props.children, {
  window,
  document: { createElement: () => ({}), getElementsByTagName: () => [anchor] },
});
assert.equal(inserted.length, 1);
assert.equal(inserted[0].src, "https://www.clarity.ms/tag/z45hin4a0v");
assert.equal(inserted[0].async, 1);
const [consent, environment] = JSON.parse(JSON.stringify(window.clarity.q.map((args) => Array.from(args))));
assert.deepEqual(consent, ["consentv2", { ad_Storage: "denied", analytics_Storage: "denied" }]);
assert.deepEqual(environment, ["set", "environment", "production"]);

env.NEXT_PUBLIC_CLARITY_PROJECT_ID = '</script><script>alert(1)</script>';
assert.equal(exports.ClarityAnalytics(), null);
console.log("Clarity loader and consent checks passed");
