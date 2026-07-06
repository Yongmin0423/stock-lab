"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/lib/ai/analyze";

type Display = {
  result: AnalysisResult;
  isMock: boolean;
  createdAt: string | Date;
};

const VERDICT_STYLE: Record<string, string> = {
  매수검토: "bg-[rgba(240,68,82,0.15)] text-[var(--up)]",
  관망: "bg-[rgba(124,108,240,0.18)] text-[var(--accent)]",
  회피: "bg-[rgba(49,130,246,0.15)] text-[var(--down)]",
};

/** reasons 안의 [note-12] 인용을 노트 링크로 변환 */
function CitedText({ text }: { text: string }) {
  const parts = text.split(/(\[note-\d+\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[note-(\d+)\]$/);
        if (!m) return <span key={i}>{p}</span>;
        return (
          <Link
            key={i}
            href={`/notes/${m[1]}`}
            className="rounded bg-[rgba(217,166,63,0.12)] px-1.5 py-0.5 text-xs font-semibold text-[var(--gold)] hover:underline"
          >
            {p}
          </Link>
        );
      })}
    </>
  );
}

export function AnalyzePanel({ symbol, initial }: { symbol: string; initial: Display | null }) {
  const [display, setDisplay] = useState<Display | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      setDisplay(data);
      router.refresh(); // 이력 갱신
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setLoading(false);
    }
  }

  const r = display?.result;

  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">AI 분석</h2>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "분석 중… (수십 초 걸릴 수 있어요)" : "✦ AI 분석 실행"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-[rgba(240,68,82,0.4)] bg-[rgba(240,68,82,0.08)] px-4 py-3 text-sm text-[var(--up)]">
          {error}
        </div>
      )}

      {r && (
        <div className="mt-3 rounded-xl border border-[rgba(124,108,240,0.4)] bg-gradient-to-b from-[rgba(124,108,240,0.08)] to-transparent p-5">
          {display?.isMock && (
            <div className="mb-3 rounded-lg bg-[rgba(217,166,63,0.1)] px-3 py-2 text-xs text-[var(--gold)]">
              모의 분석입니다 — <code className="font-mono">ANTHROPIC_API_KEY</code> 설정 시 노트·뉴스를 반영한 실제
              분석이 실행됩니다 (모의 결과는 이력에 저장되지 않아요)
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-4 py-1 text-sm font-extrabold ${VERDICT_STYLE[r.verdict]}`}>
              {r.verdict}
            </span>
            <span className="text-xs text-[var(--text-dim)]">확신도 {r.confidence}/5</span>
            {display?.createdAt && (
              <span className="ml-auto text-xs text-[var(--text-faint)]">
                {new Date(display.createdAt).toLocaleString("ko-KR")}
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-1.5">
            {r.reasons.map((reason, i) => (
              <li key={i} className="pl-4 text-sm leading-relaxed text-[var(--text-dim)] [text-indent:-1rem]">
                <span className="font-bold text-[var(--accent)]">· </span>
                <CitedText text={reason} />
              </li>
            ))}
          </ul>

          {r.risks.length > 0 && (
            <>
              <div className="mt-4 text-xs font-bold text-[var(--text-faint)]">리스크</div>
              <ul className="mt-1 space-y-1">
                {r.risks.map((risk, i) => (
                  <li key={i} className="pl-4 text-sm text-[var(--text-dim)] [text-indent:-1rem]">
                    <span className="font-bold text-[var(--up)]">· </span>
                    {risk}
                  </li>
                ))}
              </ul>
            </>
          )}

          {r.challenges.length > 0 && (
            <div className="mt-4 rounded-lg border border-[rgba(217,166,63,0.4)] bg-[rgba(217,166,63,0.06)] p-3">
              <div className="text-xs font-bold text-[var(--gold)]">⚠ 내 원칙에 대한 반론</div>
              <ul className="mt-1.5 space-y-1">
                {r.challenges.map((c, i) => (
                  <li key={i} className="text-sm leading-relaxed text-[var(--text-dim)]">
                    <CitedText text={c} />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-[var(--text-faint)]">
                반론이 타당하다고 판단되면 해당 노트를 수정하세요 — 다음 분석부터 반영됩니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
