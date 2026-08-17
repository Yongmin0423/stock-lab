"use client";

import { useFormStatus } from "react-dom";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? (
        <>
          <span className="sr-only">로그인 중</span>
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
          />
        </>
      ) : (
        "로그인"
      )}
    </button>
  );
}
