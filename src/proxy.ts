import { NextResponse, type NextRequest } from "next/server";
import { requiresOperator, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * 공개 조회와 운영자 실행 권한을 분리한다. 인증 설정이 없으면 쓰기는 차단한다.
 */
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/cron/")) return NextResponse.next();
  if (!requiresOperator(req.nextUrl.pathname, req.method)) return NextResponse.next();

  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (password && secret && await verifySessionToken(token, secret)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // 정적 리소스 제외 전부 보호
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg|icon-192.png|icon-512.png).*)"],
};
