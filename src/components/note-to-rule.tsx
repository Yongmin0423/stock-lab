"use client";

import { useState, useTransition } from "react";
import { saveRuleAction } from "@/app/actions";
import { METRIC_LABELS, type RuleCondition } from "@/lib/rules";

type Proposal = {
  possible: boolean;
  name: string;
  conditions: RuleCondition[];
  note: string;
};

export function NoteToRule({ noteId }: { noteId: number }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function run() {
    setLoading(true);
    setError(null);
    setAdded(false);
    try {
      const res = await fetch("/api/note-to-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "변환 실패");
      setProposal(data.proposal);
      setIsMock(data.isMock);
    } catch (e) {
      setError(e instanceof Error ? e.message : "변환 실패");
    } finally {
      setLoading(false);
    }
  }

  function addRule() {
    if (!proposal) return;
    startTransition(async () => {
      await saveRuleAction({ name: proposal.name, definition: proposal.conditions, enabled: true });
      setAdded(true);
    });
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">노트 → 룰 변환</h2>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg border border-[rgba(124,108,240,0.5)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] hover:bg-[rgba(124,108,240,0.08)] disabled:opacity-50"
        >
          {loading ? "변환 중…" : "이 노트로 스크리닝 룰 제안받기"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">
        정성적 원칙을 정량 룰로 바꿔 발굴·스크리닝에 활용합니다 (공부 → 노트 → 룰 → 발굴)
      </p>

      {error && <div className="mt-3 text-sm text-[var(--up)]">{error}</div>}

      {proposal && (
        <div className="mt-3 rounded-xl border border-[rgba(124,108,240,0.35)] bg-[var(--surface)] p-4">
          {isMock && (
            <div className="mb-2 text-xs text-[var(--gold)]">모의 제안 — ANTHROPIC_API_KEY 설정 시 실제 변환</div>
          )}
          {!proposal.possible ? (
            <p className="text-sm text-[var(--text-dim)]">
              이 노트는 정량 룰로 변환하기 어려워요 — 정성적 원칙은 AI 분석 컨텍스트로 충분히 활용됩니다.
            </p>
          ) : (
            <>
              <div className="font-bold">{proposal.name}</div>
              <div className="num mt-2 flex flex-wrap gap-2">
                {proposal.conditions.map((c, i) => (
                  <span key={i} className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-sm">
                    {METRIC_LABELS[c.metric] ?? c.metric} {c.op} {c.value}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--text-dim)]">{proposal.note}</p>
              <button
                onClick={addRule}
                disabled={pending || added}
                className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
              >
                {added ? "룰에 추가됨 ✓ (설정에서 확인)" : pending ? "추가 중…" : "+ 룰로 추가"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
