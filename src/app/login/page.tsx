import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginSubmitButton } from "./submit-button";
import { PageLoading } from "@/components/page-loading";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, verifyPassword } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";

  const expected = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!expected || !secret) redirect("/login?error=config");

  const password = String(formData.get("password") ?? "");
  if (!(await verifyPassword(password, expected))) redirect("/login?error=invalid");

  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(secret, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export default function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginContent {...props} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-sm items-center">
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl shadow-black/20">
        <div className="mb-1 text-xl font-extrabold tracking-tight">
          Stock<span className="text-[var(--accent)]">Lab</span>
        </div>
        <p className="mb-6 text-sm text-[var(--text-dim)]">계속하려면 비밀번호를 입력하세요.</p>

        <form action={login} className="space-y-3">
          <label htmlFor="password" className="block text-xs font-bold text-[var(--text-dim)]">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          {error === "invalid" && <p className="text-sm text-[var(--up)]">비밀번호가 올바르지 않습니다.</p>}
          {error === "config" && <p className="text-sm text-[var(--up)]">AUTH_PASSWORD와 AUTH_SECRET을 설정해주세요.</p>}
          <LoginSubmitButton />
        </form>
      </div>
    </div>
  );
}
