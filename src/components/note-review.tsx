"use client";

import { useState } from "react";
import type { ReviewResult } from "@/lib/ai/review";

type Props = {
  noteId: number;
  initial: ReviewResult | null;
  initialAt: Date | null;
};

const SECTIONS: Array<{ key: keyof ReviewResult; label: string; color: string }> = [
  { key: "factual_issues", label: "사실 오류", color: "text-[var(--up)]" },
  { key: "overgeneralizations", label: "과잉일반화", color: "text-[var(--gold)]" },
  { key: "counterexamples", label: "반례", color: "text-[var(--down)]" },
  { key: "suggestions", label: "보완 제안", color: "text-[var(--accent)]" },
];

export function NoteReview({ noteId, initial, initialAt }: Props) {
  const [review, setReview] = useState<ReviewResult | null>(initial);
  const [at, setAt] = useState<Date | null>(initialAt);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검토 실패");
      setReview(data.review);
      setAt(new Date(data.reviewedAt));
      setIsMock(data.isMock);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검토 실패");
    } finally {
      setLoading(false);
    }
  }

  const hasIssues =
    review && (review.factual_issues.length > 0 || review.overgeneralizations.length > 0);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">AI 검토</h2>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg border border-[rgba(217,166,63,0.5)] px-3 py-1.5 text-xs font-bold text-[var(--gold)] hover:bg-[rgba(217,166,63,0.08)] disabled:opacity-50"
        >
          {loading ? "검토 중…" : review ? "다시 검토" : "이 노트 검토받기"}
        </button>
        {at && <span className="text-[11px] text-[var(--text-faint)]">{new Date(at).toLocaleString("ko-KR")}</span>}
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">
        이 노트는 AI 분석의 판단 기준이 됩니다 — 오류·과잉일반화가 있으면 분석도 틀어져요.
      </p>

      {error && <div className="mt-3 text-sm text-[var(--up)]">{error}</div>}

      {review && (
        <div className="mt-3 space-y-3 rounded-xl border border-[rgba(217,166,63,0.35)] bg-[var(--surface)] p-4">
          {isMock && (
            <div className="rounded-lg bg-[rgba(217,166,63,0.1)] px-3 py-2 text-xs text-[var(--gold)]">
              모의 검토 — ANTHROPIC_API_KEY 설정 시 실제 검토가 실행됩니다
            </div>
          )}
          <p className={`text-sm font-semibold ${hasIssues ? "text-[var(--gold)]" : "text-[var(--text-dim)]"}`}>
            {review.overall}
          </p>
          {SECTIONS.map(({ key, label, color }) => {
            const items = review[key] as string[];
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <div className={`text-xs font-bold ${color}`}>{label}</div>
                <ul className="mt-1 space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="pl-4 text-sm leading-relaxed text-[var(--text-dim)] [text-indent:-1rem]">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {hasIssues && (
            <p className="text-[11px] text-[var(--text-faint)]">
              타당한 지적이면 위 에디터에서 노트를 수정하세요 — 다음 분석부터 반영됩니다. 동의하지 않으면 그대로 두면
              됩니다 (판단은 항상 당신의 몫).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
