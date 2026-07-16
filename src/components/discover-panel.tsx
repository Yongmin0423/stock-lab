"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStockAction } from "@/app/actions";

type Pick = {
  symbol: string;
  name: string;
  fit_score: number;
  reason: string;
  cited: string;
  caution: string;
};

type Result = {
  picks: Pick[];
  scannedCount: number | null;
  candidateCount?: number | null;
  message?: string;
  isMock?: boolean;
  createdAt?: string | Date;
};

export function DiscoverPanel({ initial, watchlist }: { initial: Result | null; watchlist: string[] }) {
  const [result, setResult] = useState<Result | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/discover", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "발굴 실패");
      setResult({ ...data, createdAt: new Date() });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "발굴 실패");
    } finally {
      setLoading(false);
    }
  }

  function addToWatchlist(p: Pick) {
    const market = p.symbol.startsWith("KR:") ? ("KR" as const) : ("US" as const);
    startTransition(async () => {
      await addStockAction(p.symbol, p.name, market);
      setAdded((prev) => [...prev, p.symbol]);
    });
  }

  function openDetail(p: Pick, inList: boolean) {
    if (inList) {
      router.push(`/stock/${encodeURIComponent(p.symbol)}`);
      return;
    }

    const market = p.symbol.startsWith("KR:") ? ("KR" as const) : ("US" as const);
    startTransition(async () => {
      await addStockAction(p.symbol, p.name, market);
      router.push(`/stock/${encodeURIComponent(p.symbol)}`);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={loading}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "유니버스 스캔 중… (1~2분 걸려요)" : "🔍 새로 발굴"}
        </button>
        {result?.createdAt && (
          <span className="text-xs text-[var(--text-faint)]">
            마지막 발굴: {new Date(result.createdAt).toLocaleString("ko-KR")}
          </span>
        )}
      </div>

      {error && <div className="mt-3 text-sm text-[var(--up)]">{error}</div>}

      {result && (
        <div className="mt-5">
          <div className="mb-3 text-xs text-[var(--text-faint)]">
            {result.scannedCount ?? "?"}종목 스캔 → 룰 통과 {result.candidateCount ?? 0}종목 → AI 적합도 평가
            {result.isMock && " (모의 — ANTHROPIC_API_KEY 필요, 저장 안 됨)"}
          </div>

          {result.picks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-dim)]">
              {result.message ?? "내 원칙에 맞는 종목이 없었어요. 설정에서 룰 기준을 조정해보세요."}
            </div>
          ) : (
            <div className="space-y-3">
              {result.picks.map((p) => {
                const inList = watchlist.includes(p.symbol) || added.includes(p.symbol);
                return (
                  <div key={p.symbol} className="rounded-xl border border-[rgba(217,166,63,0.35)] bg-[var(--surface)] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openDetail(p, inList)}
                        disabled={pending}
                        className="font-bold hover:text-[var(--accent)] hover:underline disabled:opacity-50"
                        title="종목 상세 보기"
                      >
                        {p.name}
                      </button>
                      <span className="text-xs text-[var(--text-faint)]">{p.symbol.replace(":", " · ")}</span>
                      <span className="rounded-full bg-[rgba(217,166,63,0.12)] px-2.5 py-0.5 text-xs font-bold text-[var(--gold)]">
                        적합도 {p.fit_score}/5
                      </span>
                      <button
                        onClick={() => addToWatchlist(p)}
                        disabled={inList || pending}
                        className="ml-auto rounded-lg border border-[rgba(124,108,240,0.5)] px-3 py-1 text-xs font-bold text-[var(--accent)] hover:bg-[rgba(124,108,240,0.08)] disabled:opacity-50"
                      >
                        {inList ? "watchlist에 있음 ✓" : "+ watchlist 추가"}
                      </button>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{p.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="text-[var(--gold)]">근거: {p.cited}</span>
                      <span className="text-[var(--up)]">주의: {p.caution}</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-[var(--text-faint)]">
                추가한 종목은 상세 페이지에서 정식 AI 분석(노트·뉴스 반영)을 돌려보세요.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
