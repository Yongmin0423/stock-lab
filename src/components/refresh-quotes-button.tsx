"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshQuotesButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function run() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/refresh-quotes", { method: "POST" });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError("시세를 갱신하지 못했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--text-faint)] disabled:opacity-50"
        title="관심 종목의 최신 시세를 직접 불러옵니다"
      >
        {loading ? "시세 갱신 중…" : "↻ 시세 새로고침"}
      </button>
      {error && <span className="text-xs text-[var(--up)]">{error}</span>}
    </div>
  );
}
