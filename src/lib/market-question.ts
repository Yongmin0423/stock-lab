import type { Quote } from "./providers/types";

export type MarketQuestionContext = {
  price: boolean;
  fundamentals: boolean;
  news: boolean;
  rules: boolean;
  notes: boolean;
  analyses: boolean;
};

type LocalAnswer = { answer: string; citedSymbols: string[] };

const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const item = (quote: Quote) => `${quote.name}(${quote.symbol}) ${pct(quote.changePct)}`;

export function answerSimpleMarketQuestion(question: string, quotes: Quote[]): LocalAnswer | null {
  if (quotes.length === 0) return null;
  const q = question.replaceAll(/\s+/g, " ").trim();

  if (/가장 (많이 )?(오른|상승한)/.test(q)) {
    const top = quotes.reduce((best, quote) => (quote.changePct > best.changePct ? quote : best));
    return { answer: `오늘 가장 많이 오른 종목은 ${item(top)}입니다.`, citedSymbols: [top.symbol] };
  }

  if (/가장 (많이 )?(내린|하락한)/.test(q)) {
    const bottom = quotes.reduce((worst, quote) => (quote.changePct < worst.changePct ? quote : worst));
    return { answer: `오늘 가장 많이 내린 종목은 ${item(bottom)}입니다.`, citedSymbols: [bottom.symbol] };
  }

  if (/(하락한|내린) 종목/.test(q)) {
    const matches = quotes.filter((quote) => quote.changePct < 0).sort((a, b) => a.changePct - b.changePct);
    return {
      answer: matches.length ? `하락한 종목은 ${matches.map(item).join(", ")}입니다.` : "오늘 하락한 종목이 없습니다.",
      citedSymbols: matches.map((quote) => quote.symbol),
    };
  }

  const threshold = q.match(/등락률(?:이|은)?\s*(\d+(?:\.\d+)?)\s*%?\s*이상/);
  if (threshold) {
    const value = Number(threshold[1]);
    const matches = quotes.filter((quote) => quote.changePct >= value).sort((a, b) => b.changePct - a.changePct);
    return {
      answer: matches.length
        ? `등락률이 ${value}% 이상인 종목은 ${matches.map(item).join(", ")}입니다.`
        : `등락률이 ${value}% 이상인 종목이 없습니다.`,
      citedSymbols: matches.map((quote) => quote.symbol),
    };
  }

  return null;
}

export function marketQuestionContext(question: string): MarketQuestionContext {
  const broad = /비교|분석|어때|어떤가|왜|전망|리스크|종합/.test(question);
  const context = {
    price: /가격|주가|등락|상승|하락|오른|내린|고점|저점|추세/.test(question),
    fundamentals: /PER|PBR|EPS|ROE|재무|실적|부채|배당|시가총액|저평가|고평가/i.test(question),
    news: /뉴스|이슈|호재|악재|소식/.test(question),
    rules: /룰|기준|조건|통과|스크리닝/.test(question),
    notes: /노트|원칙|공부|내 생각/.test(question),
    analyses: /최근 분석|AI 분석|매수검토|관망|회피|판정/.test(question),
  };

  if (broad || !Object.values(context).some(Boolean)) {
    return { price: true, fundamentals: true, news: true, rules: true, notes: true, analyses: true };
  }
  return context;
}
