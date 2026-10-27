import * as Sentry from "@sentry/nextjs";
import { connection, NextResponse } from "next/server";
import { verifyCronAuthorization } from "@/lib/auth";
import { refreshScreeningFundamentals } from "@/lib/screening-refresh";

export const maxDuration = 300;

export async function GET(req: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!verifyCronAuthorization(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await refreshScreeningFundamentals()) });
  } catch (e) {
    console.error("screening refresh 실패:", e);
    Sentry.captureException(e, { tags: { task: "cron-screening" } });
    return NextResponse.json({ error: e instanceof Error ? e.message : "갱신 실패" }, { status: 500 });
  }
}
