import Link from "next/link";
import { Suspense } from "react";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { PageLoading } from "@/components/page-loading";
import { hasDb } from "@/lib/db";
import { listNotes, tagCounts } from "@/lib/db/queries/notes";
import { timeAgo } from "@/lib/format";

export default function NotesPage(props: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <NotesContent {...props} />
    </Suspense>
  );
}

async function NotesContent({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  if (!hasDb()) return <DbSetupNotice />;
  const { tag, q } = await searchParams;

  const [items, tags] = [await listNotes({ tag, q }), await tagCounts()];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">지식 노트</h1>
        <span className="text-xs text-[var(--text-faint)]">
          여기 쌓이는 내용이 AI 분석의 판단 기준이 됩니다
        </span>
        <a
          href="/api/export-notes"
          className="ml-auto rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-dim)] hover:border-[var(--text-faint)]"
        >
          ⬇ 백업(.md)
        </a>
        <Link
          href="/notes/new"
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:brightness-110"
        >
          + 새 노트
        </Link>
      </div>

      {/* 검색 + 태그 필터 */}
      <form className="mb-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="노트 검색…"
          className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
        />
      </form>
      {tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            href="/notes"
            className={`rounded-full border px-3 py-1 text-xs ${!tag ? "border-[var(--gold)] text-[var(--gold)]" : "border-[var(--border)] text-[var(--text-dim)]"}`}
          >
            전체
          </Link>
          {tags.map((t) => (
            <Link
              key={t.tag}
              href={`/notes?tag=${encodeURIComponent(t.tag)}`}
              className={`rounded-full border px-3 py-1 text-xs ${tag === t.tag ? "border-[var(--gold)] text-[var(--gold)]" : "border-[var(--border)] text-[var(--text-dim)]"}`}
            >
              {t.tag} {t.count}
            </Link>
          ))}
        </div>
      )}

      {/* 목록 */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-dim)]">
          {q || tag ? (
            "조건에 맞는 노트가 없어요."
          ) : (
            <>
              첫 노트를 작성하면 AI 분석이 당신의 원칙을 반영하기 시작해요.
              <div className="mt-3">
                <Link href="/notes/new" className="text-[var(--accent)] underline">
                  첫 노트 작성하기
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((n) => (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--text-faint)]"
            >
              <div className="font-bold">{n.title}</div>
              {n.source && <div className="mt-0.5 text-xs text-[var(--text-faint)]">📖 {n.source}</div>}
              <p className="mt-2 line-clamp-2 text-sm text-[var(--text-dim)]">{n.content}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {n.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[rgba(217,166,63,0.12)] px-2 py-0.5 text-[11px] text-[var(--gold)]">
                    {t}
                  </span>
                ))}
                <span className="ml-auto text-[11px] text-[var(--text-faint)]">{timeAgo(n.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
