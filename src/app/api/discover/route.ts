import { operatorApiError } from "@/lib/operator";
import { NextResponse } from "next/server";
import { generateDiscovery } from "@/lib/discover-run";

export const maxDuration = 300;

export async function POST() {
  const denied = await operatorApiError();
  if (denied) return denied;
  try {
    const result = await generateDiscovery();
    return NextResponse.json(result);
  } catch (e) {
    console.error("discover 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "발굴 실패" }, { status: 500 });
  }
}
