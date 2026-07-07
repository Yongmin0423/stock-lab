import { NextResponse } from "next/server";
import { generateBriefing } from "@/lib/briefing-run";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { slot } = (await req.json()) as { slot?: "morning" | "evening" };
    const resolvedSlot = slot ?? (new Date().getHours() < 12 ? "morning" : "evening");
    const { row, isMock } = await generateBriefing(resolvedSlot);
    return NextResponse.json({ id: row.id, isMock });
  } catch (e) {
    console.error("briefing 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "브리핑 실패" }, { status: 500 });
  }
}
