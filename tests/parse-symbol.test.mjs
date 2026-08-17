import assert from "node:assert/strict";
import { isKrOnlySearchQuery, parseSymbol } from "../src/lib/providers/types.ts";

assert.deepEqual(parseSymbol("US:VZ"), { market: "US", code: "VZ" });
assert.deepEqual(parseSymbol("VZ"), { market: "US", code: "VZ" });
assert.deepEqual(parseSymbol("005930"), { market: "KR", code: "005930" });
assert.throws(() => parseSymbol("잘못된 값"));

assert.equal(isKrOnlySearchQuery("삼성전자"), true);
assert.equal(isKrOnlySearchQuery("005930"), true);
assert.equal(isKrOnlySearchQuery("AAPL"), false);
