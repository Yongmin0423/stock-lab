import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hasAiKey } from "@/lib/ai/analyze";
import { mockReview, runReview } from "@/lib/ai/review";
import { getDb } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { noteId } = (await req.json()) as { noteId?: number };
    if (!noteId) return NextResponse.json({ error: "noteId 필요" }, { status: 400 });

    const db = getDb();
    const note = await db.query.notes.findFirst({ where: eq(notes.id, noteId) });
    if (!note) return NextResponse.json({ error: "노트 없음" }, { status: 404 });

    if (!hasAiKey()) {
      return NextResponse.json({ review: mockReview(), isMock: true, reviewedAt: new Date() });
    }

    const review = await runReview(note);
    const reviewedAt = new Date();
    await db.update(notes).set({ aiReview: review, reviewedAt }).where(eq(notes.id, noteId));

    return NextResponse.json({ review, isMock: false, reviewedAt });
  } catch (e) {
    console.error("review 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "검토 실패" }, { status: 500 });
  }
}
