import assert from "node:assert/strict";
import { parseSymbol } from "../src/lib/providers/types.ts";

assert.deepEqual(parseSymbol("US:VZ"), { market: "US", code: "VZ" });
assert.deepEqual(parseSymbol("VZ"), { market: "US", code: "VZ" });
assert.deepEqual(parseSymbol("005930"), { market: "KR", code: "005930" });
assert.throws(() => parseSymbol("잘못된 값"));
