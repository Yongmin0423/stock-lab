export function DbSetupNotice({ error }: { error?: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[rgba(124,108,240,0.4)] bg-[var(--surface)] p-6">
      <h2 className="font-bold text-[var(--accent)]">
        {error ? "DB 연결에 실패했어요" : "DB 설정이 필요해요 (5분)"}
      </h2>
      {error && (
        <p className="mt-2 rounded bg-[var(--surface-2)] p-2 font-mono text-xs text-[var(--text-dim)]">{error}</p>
      )}
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--text-dim)]">
        <li>
          <a href="https://supabase.com" target="_blank" className="text-[var(--accent)] underline">
            supabase.com
          </a>
          에서 무료 프로젝트 생성 (리전: Seoul)
        </li>
        <li>
          프로젝트 대시보드 상단 <b>Connect</b> 버튼 → <b>Transaction pooler</b> URI 복사
        </li>
        <li>
          <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-xs">.env.local</code>에{" "}
          <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-xs">DATABASE_URL=복사한URI</code> 추가
          (비밀번호 부분 교체)
        </li>
        <li>
          터미널: <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-xs">pnpm db:push</code> (테이블 생성)
        </li>
        <li>
          dev 서버 재시작: <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-xs">pnpm dev</code>
        </li>
      </ol>
    </div>
  );
}
