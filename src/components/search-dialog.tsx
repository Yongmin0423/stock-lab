"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addStockAction } from "@/app/actions";
import type { SymbolInfo } from "@/lib/providers/types";

export function SearchDialog({ existing }: { existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K로 열기, Esc로 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // 300ms 디바운스 검색
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function add(r: SymbolInfo) {
    startTransition(async () => {
      await addStockAction(r.symbol, r.name, r.market);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-auto flex min-w-52 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-faint)] hover:border-[var(--text-faint)]"
      >
        종목 검색…
        <kbd className="ml-auto rounded bg-[var(--surface-2)] px-1.5 text-[11px]">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="티커 또는 회사명 (예: AAPL, 애플)"
              className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--text-faint)]"
            />
            <div className="max-h-80 overflow-y-auto p-2">
              {loading && <div className="px-3 py-4 text-sm text-[var(--text-faint)]">검색 중…</div>}
              {!loading && query && results.length === 0 && (
                <div className="px-3 py-4 text-sm text-[var(--text-faint)]">결과 없음 (한국 주식은 M4에서 지원 예정)</div>
              )}
              {results.map((r) => {
                const added = existing.includes(r.symbol);
                return (
                  <button
                    key={r.symbol}
                    disabled={added || pending}
                    onClick={() => add(r)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)] disabled:opacity-50"
                  >
                    <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
                      {r.market}
                    </span>
                    <span className="font-semibold">{r.symbol.split(":")[1]}</span>
                    <span className="truncate text-[var(--text-dim)]">{r.name}</span>
                    <span className="ml-auto text-xs text-[var(--accent)]">
                      {added ? "추가됨 ✓" : "+ 추가"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
