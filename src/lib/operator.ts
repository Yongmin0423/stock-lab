import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function isOperator(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!process.env.AUTH_PASSWORD || !secret) return false;
  return verifySessionToken(token, secret);
}

export async function requireOperator() {
  if (!(await isOperator())) redirect("/login");
}

export async function operatorApiError(): Promise<Response | undefined> {
  if (!(await isOperator())) {
    return Response.json({ error: "운영자 로그인이 필요합니다" }, { status: 401 });
  }
}
