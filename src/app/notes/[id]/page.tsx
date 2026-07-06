import Link from "next/link";
import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/note-editor";
import { NoteReview } from "@/components/note-review";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { hasDb } from "@/lib/db";
import { getNote } from "@/lib/db/queries/notes";

export const dynamic = "force-dynamic";

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
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
        <h1 className="text-xl font-extrabold tracking-tight">노트 수정</h1>
        <span className="text-xs text-[var(--text-faint)]">
          수정하면 다음 AI 분석부터 즉시 반영됩니다
        </span>
      </div>
      <NoteEditor note={note} />
      <NoteReview noteId={note.id} initial={note.aiReview ?? null} initialAt={note.reviewedAt ?? null} />
    </div>
  );
}
