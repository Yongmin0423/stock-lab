"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { deleteNoteAction, saveNoteAction } from "@/app/actions";
import type { NoteRow } from "@/lib/db/queries/notes";

export function NoteEditor({ note }: { note?: NoteRow }) {
  const [content, setContent] = useState(note?.content ?? "");
  const [preview, setPreview] = useState(false);

  return (
    <form action={saveNoteAction} className="space-y-4">
      {note && <input type="hidden" name="id" value={note.id} />}

      <input
        name="title"
        defaultValue={note?.title}
        required
        placeholder="제목 (예: 안전마진의 실제 적용)"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-bold outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="source"
          defaultValue={note?.source ?? ""}
          placeholder="출처 (예: 현명한 투자자 20장)"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
        />
        <input
          name="relatedSymbols"
          defaultValue={note?.relatedSymbols.join(", ")}
          placeholder="관련 종목, 쉼표 구분 (예: US:AAPL, KR:005930)"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
        />
      </div>

      <input
        name="tags"
        defaultValue={note?.tags.join(", ")}
        placeholder="태그, 쉼표 구분 (예: 가치투자, 안전마진)"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
      />

      <div>
        <div className="mb-2 flex gap-1">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${!preview ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-faint)]"}`}
          >
            작성
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${preview ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-faint)]"}`}
          >
            미리보기
          </button>
        </div>

        {preview ? (
          <div className="prose-invert min-h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed [&_code]:text-[var(--gold)] [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2 [&_strong]:text-[var(--accent)]">
            <ReactMarkdown>{content || "*내용이 비어있어요*"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={14}
            placeholder={"마크다운으로 작성하세요.\n\n예:\n## 핵심 개념\n- 내재가치 추정은 틀릴 수 있다\n- 추정치 대비 **30% 이상 할인**된 가격에서만 매수"}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
          />
        )}
        {/* 미리보기 상태에서도 content가 제출되도록 */}
        {preview && <input type="hidden" name="content" value={content} />}
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">
          저장
        </button>
        {note && (
          <button
            type="button"
            onClick={() => {
              if (confirm("이 노트를 삭제할까요? 삭제하면 이후 AI 분석에서 제외됩니다.")) {
                deleteNoteAction(note.id);
              }
            }}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-dim)] hover:border-[var(--up)] hover:text-[var(--up)]"
          >
            삭제
          </button>
        )}
      </div>
    </form>
  );
}
