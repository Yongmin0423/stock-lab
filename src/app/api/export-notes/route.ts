import { listNotes } from "@/lib/db/queries/notes";

/** 노트 전체 markdown 백업 다운로드 — 노트는 이 서비스의 유일한 대체 불가 자산 */
export async function GET() {
  const notes = await listNotes();

  const md = [
    `# StockLab 지식 노트 백업`,
    `> ${new Date().toISOString().slice(0, 10)} · 총 ${notes.length}개`,
    "",
    ...notes.map((n) =>
      [
        `---`,
        ``,
        `## ${n.title}`,
        ``,
        `- 태그: ${n.tags.join(", ") || "없음"}`,
        `- 출처: ${n.source ?? "없음"}`,
        `- 관련 종목: ${n.relatedSymbols.join(", ") || "없음"}`,
        `- 작성: ${n.createdAt.toISOString().slice(0, 10)} / 수정: ${n.updatedAt.toISOString().slice(0, 10)}`,
        ``,
        n.content,
        ``,
      ].join("\n"),
    ),
  ].join("\n");

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="stocklab-notes-${new Date().toISOString().slice(0, 10)}.md"`,
    },
  });
}
