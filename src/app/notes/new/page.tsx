import Link from "next/link";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { requireOperator } from "@/lib/operator";
import { NoteEditor } from "@/components/note-editor";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { hasDb } from "@/lib/db";

export default function NewNotePage() {
  return <Suspense fallback={<PageLoading />}><NewNoteContent /></Suspense>;
}

async function NewNoteContent() {
  await requireOperator();
  if (!hasDb()) return <DbSetupNotice />;
  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <Link href="/notes" className="text-sm text-[var(--text-faint)] hover:text-[var(--text-dim)]">
          ←
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight">새 노트</h1>
      </div>
      <NoteEditor />
    </div>
  );
}
