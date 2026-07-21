import assert from "node:assert/strict";
import { explainVerdictQuestion } from "../src/lib/verdict-explanation.ts";

assert.match(explainVerdictQuestion("카드의 AI:관망이 무슨 의미야?") ?? "", /더 지켜보자/);
assert.match(explainVerdictQuestion("매수검토 뜻을 설명해줘") ?? "", /매수 추천.*아닙니다/);
assert.equal(explainVerdictQuestion("오늘 가장 많이 오른 종목은?"), null);
