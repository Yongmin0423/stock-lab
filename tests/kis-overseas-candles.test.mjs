import assert from "node:assert/strict";
import { parseOverseasDailyRows } from "../src/lib/providers/kis-overseas.ts";

assert.deepEqual(
  parseOverseasDailyRows([
    { xymd: "20260807", open: "23.5000", high: "23.9100", low: "23.3500", clos: "23.7900", tvol: "34887029" },
  ]),
  [{ date: "2026-08-07", open: 23.5, high: 23.91, low: 23.35, close: 23.79, volume: 34887029 }],
);
