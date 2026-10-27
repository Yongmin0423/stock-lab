import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoteEditor } from "@/components/note-editor";
import { PageLoading } from "@/components/page-loading";
import { NoteReview } from "@/components/note-review";
import { NoteToRule } from "@/components/note-to-rule";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { hasDb } from "@/lib/db";
import { getNote } from "@/lib/db/queries/notes";
import { isOperator } from "@/lib/operator";
import { notePreview } from "@/lib/note-preview";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  if (!hasDb()) return pageMetadata("투자 공부 노트", "투자 공부 노트의 공개 미리보기를 확인하세요.", `/notes/${id}`);
  const note = await getNote(id);
  if (!note) notFound();
  return pageMetadata(note.title, notePreview(note.content), `/notes/${id}`);
}

export default function EditNotePage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditNoteContent {...props} />
    </Suspense>
  );
}

async function EditNoteContent({ params }: { params: Promise<{ id: string }> }) {
  const operator = await isOperator();
  if (!hasDb()) return <DbSetupNotice />;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const note = await getNote(id);
  if (!note) notFound();

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <Link href="/notes" className="text-sm text-[var(--text-faint)] hover:text-[var(--text-dim)]">
          ←
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight">{operator ? "노트 수정" : note.title}</h1>
        {operator && <span className="text-xs text-[var(--text-faint)]">
          수정하면 다음 AI 분석부터 즉시 반영됩니다
        </span>}
      </div>
      {operator ? <><NoteEditor note={note} />
      <NoteReview noteId={note.id} initial={note.aiReview ?? null} initialAt={note.reviewedAt ?? null} />
      <NoteToRule noteId={note.id} />
      </> : <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-dim)]">{notePreview(note.content)}</p>
        <div className="mt-6 border-t border-[var(--border)] pt-5 text-sm text-[var(--text-faint)]">
          노트 전문을 더 읽으려면 로그인해주세요.
          <Link href="/login" className="ml-2 text-[var(--accent)] underline">로그인하기 →</Link>
        </div>
      </div>}
    </div>
  );
}
