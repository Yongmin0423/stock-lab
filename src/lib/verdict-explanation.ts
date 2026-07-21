const EXPLANATIONS = {
  매수검토: "AI: 매수검토는 현재 데이터가 일부 투자 원칙과 룰을 충족해 추가 검토할 후보라는 뜻입니다. 매수 추천이나 주문 지시는 아닙니다.",
  관망: "AI: 관망은 현재 데이터만으로 매수 검토나 회피를 결정할 근거가 충분하지 않아 변화를 더 지켜보자는 뜻입니다. 보유나 매도를 지시하는 표현은 아닙니다.",
  회피: "AI: 회피는 현재 데이터가 투자 원칙이나 룰을 충분히 충족하지 못했거나 위험 요인이 보여 우선순위를 낮추자는 뜻입니다. 확정적인 투자 금지 판단은 아닙니다.",
} as const;

export function explainVerdictQuestion(question: string): string | null {
  if (!/(무슨|의미|뜻|뭐|설명)/.test(question)) return null;
  const verdict = (Object.keys(EXPLANATIONS) as Array<keyof typeof EXPLANATIONS>).find((key) => question.includes(key));
  return verdict ? EXPLANATIONS[verdict] : null;
}
