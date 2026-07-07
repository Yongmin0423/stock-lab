import { NextResponse, type NextRequest } from "next/server";

/**
 * Basic Auth (배포용 접근 보호 — 내 API 비용 방어)
 * BASIC_AUTH_PASSWORD 미설정 시 통과 (로컬 개발)
 * 아이디: 아무거나 / 비밀번호: BASIC_AUTH_PASSWORD
 */
export function middleware(req: NextRequest) {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) return NextResponse.next();

  // Vercel cron은 Authorization: Bearer CRON_SECRET으로 통과
  const auth = req.headers.get("authorization") ?? "";
  if (req.nextUrl.pathname.startsWith("/api/cron/")) return NextResponse.next();

  if (auth.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(":");
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("인증 필요", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="StockLab"' },
  });
}

export const config = {
  // 정적 리소스 제외 전부 보호
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
