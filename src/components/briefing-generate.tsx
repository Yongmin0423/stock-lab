"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BriefingGenerate() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run(slot: "morning" | "evening") {
    setLoading(slot);
    setError(null);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "브리핑 생성 실패");
      router.replace(`/briefing?id=${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "브리핑 생성 실패");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run("morning")}
        disabled={loading !== null}
        className="rounded-xl border border-[rgba(124,108,240,0.5)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[rgba(124,108,240,0.08)] disabled:opacity-50"
      >
        {loading === "morning" ? "생성 중… (1분까지 걸려요)" : "🌅 아침 브리핑 생성"}
      </button>
      <button
        onClick={() => run("evening")}
        disabled={loading !== null}
        className="rounded-xl border border-[rgba(124,108,240,0.5)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[rgba(124,108,240,0.08)] disabled:opacity-50"
      >
        {loading === "evening" ? "생성 중… (1분까지 걸려요)" : "🌆 저녁 브리핑 생성"}
      </button>
      {error && <span className="text-sm text-[var(--up)]">{error}</span>}
    </div>
  );
}
