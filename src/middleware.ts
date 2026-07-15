import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * 개인용 쿠키 인증. 두 환경변수가 모두 없으면 로컬 개발을 위해 통과한다.
 * 하나만 설정된 경우에는 실수로 보호가 풀리지 않도록 요청을 차단한다.
 */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/cron/")) return NextResponse.next();

  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password && !secret) return NextResponse.next();
  if (req.nextUrl.pathname === "/login") return NextResponse.next();
  if (!password || !secret) return new NextResponse("AUTH_PASSWORD와 AUTH_SECRET 설정이 필요합니다", { status: 500 });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token, secret)) return NextResponse.next();

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // 정적 리소스 제외 전부 보호
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
