"use client";

import { useState } from "react";

export function ResearchWorkerConnection({ configured }: { configured: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function check() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/research/health", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "연결을 확인하지 못했습니다.");
      setMessage(`연결됨 · 확인 시각 ${new Date(result.checkedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);
    } catch (error) {
      setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "연결 확인 시간이 초과되었습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-bold">리서치 서버 연결</h2>
      <p className="mt-2 text-xs text-[var(--text-dim)]">
        {configured ? "연결 설정이 등록되어 있습니다. 연결 확인으로 서버 응답을 점검하세요." : "리서치 서버 연결이 아직 설정되지 않았습니다."}
      </p>
      <button type="button" onClick={check} disabled={loading || !configured}
        className="mt-3 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:border-[var(--text-faint)] disabled:opacity-50">
        {loading ? "확인 중…" : "연결 확인"}
      </button>
      <p role="status" aria-live="polite" className="mt-2 text-xs text-[var(--text-dim)]">{message}</p>
    </section>
  );
}
