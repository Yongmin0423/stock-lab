import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { isOperator } from "@/lib/operator";

async function logout() {
  "use server";
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

export async function OperatorMenu() {
  const operator = await isOperator();
  const style = "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]";

  return operator ? (
    <div className="ml-auto flex shrink-0 items-center">
      <Link href="/settings" className={style}>설정</Link>
      <form action={logout}><button className={style}>로그아웃</button></form>
    </div>
  ) : (
    <Link href="/login" className={`ml-auto shrink-0 ${style}`}>운영자 로그인</Link>
  );
}
