const blocks = Array.from({ length: 8 });

export default function Loading() {
  return (
    <div aria-label="종목 상세 불러오는 중" className="animate-pulse motion-reduce:animate-none">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-8 w-40 rounded-lg bg-[var(--surface-2)]" />
        <div className="h-5 w-24 rounded bg-[var(--surface-2)]" />
      </div>
      <div className="h-80 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      <div className="mb-3 mt-6 h-4 w-20 rounded bg-[var(--surface-2)]" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {blocks.map((_, index) => (
          <div key={index} className="h-16 rounded-lg bg-[var(--surface-2)]" />
        ))}
      </div>
    </div>
  );
}
