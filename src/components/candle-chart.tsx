"use client";

import { createChart, ColorType, type IChartApi } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
] as const;

type CandleDto = { date: string; open: number; high: number; low: number; close: number };

export function CandleChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [days, setDays] = useState<number>(90);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9aa4b2",
      },
      grid: {
        vertLines: { color: "#1e242e" },
        horzLines: { color: "#1e242e" },
      },
      height: 320,
      timeScale: { borderColor: "#2a313c" },
      rightPriceScale: { borderColor: "#2a313c" },
    });
    chartRef.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: "#f04452",
      wickUpColor: "#f04452",
      borderUpColor: "#f04452",
      downColor: "#3182f6",
      wickDownColor: "#3182f6",
      borderDownColor: "#3182f6",
    });

    let cancelled = false;
    setStatus("loading");
    setError("");
    fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&days=${days}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `차트 조회 오류 (${r.status})`);
        if (!Array.isArray(data)) throw new Error("잘못된 차트 응답");
        return data as CandleDto[];
      })
      .then((data) => {
        if (cancelled) return;
        if (data.length === 0) {
          throw new Error("일봉 데이터가 없습니다.");
        }
        series.setData(
          data.map((c) => ({ time: c.date, open: c.open ?? c.close, high: c.high ?? c.close, low: c.low ?? c.close, close: c.close })),
        );
        chart.timeScale().fitContent();
        setStatus("ok");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "일봉 조회 실패");
        setStatus("error");
      });

    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, days]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setDays(r.days)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              days === r.days
                ? "bg-[var(--surface-2)] text-[var(--text)]"
                : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="w-full" />
      {status === "loading" && (
        <div className="py-4 text-center text-xs text-[var(--text-faint)]">차트 불러오는 중…</div>
      )}
      {status === "error" && (
        <div className="py-4 text-center text-xs text-[var(--up)]">차트 조회 실패: {error}</div>
      )}
    </div>
  );
}
