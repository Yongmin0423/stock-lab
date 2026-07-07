"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshNewsButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    setLoading(true);
    try {
      await fetch("/api/refresh-news", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--text-faint)] disabled:opacity-50"
      title="1시간 이상 지난 종목만 실제로 새로 가져옵니다"
    >
      {loading ? "갱신 중… (AI 평가 포함, 수십 초)" : "↻ 뉴스 갱신"}
    </button>
  );
}
