import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BriefingGenerate } from "@/components/briefing-generate";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { PageLoading } from "@/components/page-loading";
import { hasDb } from "@/lib/db";
import { getBriefing, listBriefings } from "@/lib/db/queries/briefings";
import { changeColorClass, formatChange } from "@/lib/format";
import { isOperator } from "@/lib/operator";

const SLOT_LABEL = { morning: "🌅 아침", evening: "🌆 저녁" } as const;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) return pageMetadata("주식 시장 브리핑", "한국·미국 시장의 아침·저녁 요약과 관심 종목의 변화, 분석 근거를 확인하세요.", "/briefing");
  const briefingId = Number(id);
  if (!Number.isSafeInteger(briefingId) || briefingId < 1 || !hasDb()) notFound();
  const briefing = await getBriefing(briefingId);
  if (!briefing) notFound();
  const date = briefing.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  return pageMetadata(
    `${date} ${briefing.slot === "morning" ? "아침" : "저녁"} 시장 브리핑`,
    briefing.marketSummary?.slice(0, 160) || "시장 요약과 종목별 주요 변화를 확인하세요.",
    `/briefing?id=${briefing.id}`,
  );
}

export default function BriefingPage(props: { searchParams: Promise<{ id?: string }> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <BriefingContent {...props} />
    </Suspense>
  );
}

async function BriefingContent({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const operator = await isOperator();
  if (!hasDb()) return <DbSetupNotice />;
  const { id } = await searchParams;

  const archive = await listBriefings(14);
  const current = id ? await getBriefing(Number(id)) : archive[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-extrabold tracking-tight">브리핑</h1>
        {operator ? <BriefingGenerate /> : <Link href="/login" className="text-sm text-[var(--accent)] underline">생성은 운영자 로그인 후 가능</Link>}
      </div>

      {!current ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-dim)]">
          {operator ? "아직 브리핑이 없어요. 위 버튼으로 첫 브리핑을 생성해보세요." : "아직 공개된 브리핑이 없습니다."}
          <div className="mt-2 text-xs text-[var(--text-faint)]">
            평일 아침·저녁에 자동 생성됩니다.
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3 text-sm text-[var(--text-dim)]">
            <span className="font-bold text-[var(--text)]">{SLOT_LABEL[current.slot]}</span>
            {new Date(current.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 생성
          </div>

          {/* 시장 요약 */}
          <div className="rounded-xl border border-[rgba(124,108,240,0.4)] bg-gradient-to-b from-[rgba(124,108,240,0.08)] to-transparent p-5">
            <div className="text-xs font-bold text-[var(--accent)]">시장 요약</div>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--text-dim)]">{current.marketSummary}</p>
          </div>

          {/* 주목 종목 */}
          {(current.watchItems?.length ?? 0) > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                주목 종목
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                {current.watchItems!.map((w, i) => (
                  <Link
                    key={i}
                    href={`/stock/${encodeURIComponent(w.symbol)}`}
                    className="rounded-xl border border-[rgba(217,166,63,0.4)] bg-gradient-to-b from-[rgba(217,166,63,0.07)] to-transparent p-4 hover:border-[var(--gold)]"
                  >
                    <div className="font-bold">{w.name}</div>
                    <p className="mt-1.5 text-sm text-[var(--text-dim)]">{w.reason}</p>
                    <div className="mt-2 text-xs text-[var(--gold)]">근거: {w.basis}</div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* 종목별 변화 */}
          <h2 className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            종목별 변화
          </h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
            {current.stockSections?.map((s) => {
              const quiet = s.summary.includes("특이사항 없음");
              return (
                <div key={s.symbol} className="flex gap-4 border-b border-[var(--border)] py-3 last:border-none">
                  <Link
                    href={`/stock/${encodeURIComponent(s.symbol)}`}
                    className="w-28 shrink-0 text-sm font-bold hover:underline"
                  >
                    {s.name}
                    {s.changePct != null && (
                      <span className={`num block text-xs font-semibold ${changeColorClass(s.changePct)}`}>
                        {formatChange(s.changePct)}
                      </span>
                    )}
                  </Link>
                  <p className={`whitespace-pre-line text-sm leading-relaxed ${quiet ? "text-[var(--text-faint)]" : "text-[var(--text-dim)]"}`}>
                    {s.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 아카이브 */}
      {archive.length > 1 && (
        <>
          <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            지난 브리핑
          </h2>
          <div className="flex flex-wrap gap-2">
            {archive.map((b) => (
              <Link
                key={b.id}
                href={`/briefing?id=${b.id}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  current?.id === b.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-faint)]"
                }`}
              >
                {new Date(b.createdAt).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  month: "numeric",
                  day: "numeric",
                })}{" "}
                {SLOT_LABEL[b.slot]}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
