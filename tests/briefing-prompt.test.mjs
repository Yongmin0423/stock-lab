import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/ai/briefing.ts", import.meta.url), "utf8");

for (const section of ["시장 지표", "재무지표", "룰 평가 상세", "관련 투자 노트", "확인된 변화", "기존 판단 영향", "다음 확인"]) {
  assert.match(source, new RegExp(section));
}
