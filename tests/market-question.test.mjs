import assert from "node:assert/strict";
import { answerSimpleMarketQuestion, marketQuestionContext } from "../src/lib/market-question.ts";

const quotes = [
  { symbol: "US:AAPL", name: "Apple", market: "US", price: 200, changePct: 2.5, currency: "USD", asOf: new Date(), isMock: false },
  { symbol: "KR:005930", name: "삼성전자", market: "KR", price: 70000, changePct: -1.2, currency: "KRW", asOf: new Date(), isMock: false },
];

assert.deepEqual(answerSimpleMarketQuestion("오늘 가장 많이 오른 종목은?", quotes)?.citedSymbols, ["US:AAPL"]);
assert.deepEqual(answerSimpleMarketQuestion("하락한 종목만 알려줘", quotes)?.citedSymbols, ["KR:005930"]);
assert.deepEqual(answerSimpleMarketQuestion("등락률이 2% 이상인 종목은?", quotes)?.citedSymbols, ["US:AAPL"]);
assert.equal(answerSimpleMarketQuestion("애플 뉴스 알려줘", quotes), null);

assert.deepEqual(marketQuestionContext("애플 뉴스 알려줘"), {
  price: false,
  fundamentals: false,
  news: true,
  rules: false,
  notes: false,
  analyses: false,
});
assert.equal(Object.values(marketQuestionContext("애플과 삼성전자를 비교해줘")).every(Boolean), true);
