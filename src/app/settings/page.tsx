import { DbSetupNotice } from "@/components/db-setup-notice";
import { NewRuleButton, RuleEditor } from "@/components/rule-editor";
import { hasDb } from "@/lib/db";
import { listRules } from "@/lib/db/queries/rules";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!hasDb()) return <DbSetupNotice />;
  const rules = await listRules();

  const keys = [
    { name: "Finnhub (미국 시세)", set: Boolean(process.env.FINNHUB_API_KEY) },
    { name: "Anthropic (AI 분석)", set: Boolean(process.env.ANTHROPIC_API_KEY) },
    { name: "KIS (한국 시세, M4)", set: Boolean(process.env.KIS_APP_KEY) },
    { name: "네이버 (한국 뉴스, M4)", set: Boolean(process.env.NAVER_CLIENT_ID) },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">설정</h1>

      <h2 className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        스크리닝 룰
      </h2>
      <p className="mb-3 text-xs text-[var(--text-faint)]">
        공부하면서 나만의 기준을 추가하세요. 룰은 종목 상세의 평가와 AI 분석 컨텍스트에 즉시 반영됩니다.
      </p>
      <div className="space-y-3">
        {rules.map((r) => (
          <RuleEditor key={r.id} rule={{ id: r.id, name: r.name, definition: r.definition, enabled: r.enabled }} />
        ))}
        <NewRuleButton />
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        API 키 상태
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {keys.map((k) => (
          <div key={k.name} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
            <span className={`inline-block h-2 w-2 rounded-full ${k.set ? "bg-emerald-500" : "bg-[var(--text-faint)]"}`} />
            {k.name}
            <span className="ml-auto text-xs text-[var(--text-faint)]">{k.set ? "설정됨" : "미설정"}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-faint)]">
        키는 .env.local 파일에서 관리합니다 (변경 후 서버 재시작 필요).
      </p>
    </div>
  );
}
