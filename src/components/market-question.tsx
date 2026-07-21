"use client";

import { FormEvent, useState } from "react";

type Answer = { answer: string; citedSymbols: string[]; contextUsed: string[]; asOf: string; hasMock: boolean };

const EXAMPLES = ["오늘 가장 많이 오른 종목은?", "하락한 종목만 알려줘", "등락률이 2% 이상인 종목은?"];

export function MarketQuestion() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/ask-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(
          response.status === 504
            ? "AI가 리서치 데이터를 분석하는 데 시간이 오래 걸렸어요. 잠시 후 다시 시도해주세요."
            : `질문 서버 오류 (${response.status || "응답 형식 오류"})`,
        );
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "질문 처리 실패");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "질문 처리 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-[rgba(124,108,240,0.35)] bg-[var(--surface)] p-4">
      <div className="mb-2 text-sm font-bold">✦ Watchlist에 물어보기</div>
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          aria-label="Watchlist 질문"
          placeholder="어떤 종목이 오르고 내렸는지 물어보세요"
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
        />
        <button
          disabled={loading || !question.trim()}
          className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "답변 중…" : "질문"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setQuestion(example)}
            className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-faint)] hover:border-[var(--text-faint)] hover:text-[var(--text-dim)]"
          >
            {example}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-[var(--up)]">{error}</p>}
      {result && (
        <div className="mt-3 rounded-xl bg-[var(--bg)] p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-dim)]">{result.answer}</p>
          <div className="mt-2 text-[11px] text-[var(--text-faint)]">
            {new Date(result.asOf).toLocaleString("ko-KR")} 기준
            {result.citedSymbols.length > 0 && ` · 근거: ${result.citedSymbols.join(", ")}`}
            {result.hasMock && " · 모의 시세 포함"}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-faint)]">참고 데이터: {result.contextUsed.join(" · ")}</div>
        </div>
      )}
    </section>
  );
}
