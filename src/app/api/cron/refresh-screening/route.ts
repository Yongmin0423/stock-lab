import { connection, NextResponse } from "next/server";
import { refreshScreeningFundamentals } from "@/lib/screening-refresh";

export const maxDuration = 300;

export async function GET(req: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await refreshScreeningFundamentals()) });
  } catch (e) {
    console.error("screening refresh 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "갱신 실패" }, { status: 500 });
  }
}
