import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require: (id) => mocks[id] ?? require(id) });
  return exports;
}

const stock = { symbol: "KR:005930", name: "삼성전자", market: "KR" };
const fetchedAt = new Date("2026-10-23T01:20:00Z");
const rows = [
  { stock, quote: { price: 70000, changePct: 1.2, fetchedAt } },
  { stock: { symbol: "AAPL", name: "Apple", market: "US" }, quote: null },
];
let joined = false;
const query = {
  from: () => query,
  leftJoin: () => { joined = true; return query; },
  orderBy: async () => rows,
};
const stocks = load("../src/lib/db/queries/stocks.ts", {
  "@/lib/db": { getDb: () => ({ select: () => query }) },
  "@/lib/db/schema": { stocks: {}, quotes: {} },
  "drizzle-orm": { asc: () => null, eq: () => null },
  "@/lib/cache": { getQuoteCached: () => { throw new Error("Home must not refresh quotes"); } },
});
const saved = await stocks.getWatchlistWithSavedQuotes();
assert.ok(joined);
assert.equal(saved.length, 2, "Stocks without a quote must remain visible");
assert.equal(saved[0].quote.price, 70000, "Old saved prices must not trigger an API refresh");
assert.equal(saved[0].quote.asOf, fetchedAt);
assert.equal(saved[0].quote.currency, "KRW");
assert.equal(saved[1].quote, null);

const { StockCard } = load("../src/components/stock-card.tsx", {
  "next/link": { default: ({ children, ...props }) => require("react").createElement("a", props, children) },
  "@/app/actions": { removeStockAction: () => {} },
  "@/components/sparkline": { Sparkline: () => null },
  "@/lib/format": { formatPrice: String, formatChange: String, changeColorClass: () => "" },
});
const missing = renderToStaticMarkup(StockCard({ stock: saved[1], quote: null }));
assert.match(missing, /Apple/);
assert.match(missing, /시세 준비 중/);
assert.match(missing, /저장된 시세가 없습니다/);
const priced = renderToStaticMarkup(StockCard({ stock, quote: saved[0].quote }));
assert.match(priced, /70000/);
assert.match(priced, /10\. 23\./, "Saved prices must include their date");

const pending = [];
function deferred(value) {
  return new Promise((resolve) => pending.push(() => resolve(value)));
}
let marketCalls = 0;
const { default: Dashboard } = load("../src/app/page.tsx", {
  "@/lib/seo": { pageMetadata: () => ({}) },
  "@/lib/operator": { isOperator: async () => false },
  "@/lib/db": { hasDb: () => true },
  "@/lib/db/queries/stocks": {
    getWatchlistWithSavedQuotes: async () => saved,
    getDashboardExtras: () => deferred({ closes: {}, funds: {} }),
  },
  "@/lib/db/queries/analyses": { latestVerdicts: () => deferred({}) },
  "@/lib/db/queries/briefings": { latestBriefing: () => deferred(null) },
  "@/lib/db/queries/discoveries": { latestDiscovery: () => deferred(null) },
  "@/lib/db/queries/rules": { listEnabledRules: () => deferred([]) },
  "@/lib/db/queries/notes": { listNotes: () => { throw new Error("Public home must not load private notes"); } },
  "@/lib/market-overview": { getMarketBar: () => { marketCalls++; return new Promise(() => {}); } },
  ...Object.fromEntries([
    "db-setup-notice", "empty-state", "market-question", "page-loading", "refresh-quotes-button",
    "search-dialog", "stock-card",
  ].map((name) => [`@/components/${name}`, {}])),
  "@/lib/format": {}, "@/lib/market-hours": {}, "@/lib/rules": {},
});
const content = Dashboard().props.children;
const body = content.type();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(pending.length, 5, "Independent queries must all start before any finishes");
pending.forEach((resolve) => resolve());
const tree = await body;
const marketBoundary = tree.props.children[0];
assert.equal(marketBoundary.type, require("react").Suspense);
assert.ok(marketBoundary.props.fallback);
assert.equal(marketCalls, 0, "Building the main body must not wait for market indices");
marketBoundary.props.children.type();
assert.equal(marketCalls, 1);
console.log("Dashboard saved quotes, missing prices, parallel queries and market boundary checks passed");
