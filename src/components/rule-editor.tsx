"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRuleAction, saveRuleAction } from "@/app/actions";
import { METRIC_LABELS, OPS, type RuleCondition } from "@/lib/rules";

type RuleData = {
  id?: number;
  name: string;
  definition: RuleCondition[];
  enabled: boolean;
};

export function RuleEditor({ rule, onDone }: { rule: RuleData; onDone?: () => void }) {
  const [name, setName] = useState(rule.name);
  const [enabled, setEnabled] = useState(rule.enabled);
  const [conds, setConds] = useState<RuleCondition[]>(rule.definition);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setCond(i: number, patch: Partial<RuleCondition>) {
    setConds((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  function save() {
    startTransition(async () => {
      await saveRuleAction({ id: rule.id, name, enabled, definition: conds.filter((c) => c.metric) });
      router.refresh();
      onDone?.();
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="룰 이름 (예: 저평가 우량주)"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-bold outline-none focus:border-[var(--accent)]"
        />
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          사용
        </label>
      </div>

      <div className="mt-3 space-y-2">
        {conds.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={c.metric}
              onChange={(e) => setCond(i, { metric: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
            >
              {Object.entries(METRIC_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={c.op}
              onChange={(e) => setCond(i, { op: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
            >
              {OPS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              value={Number.isFinite(c.value) ? c.value : ""}
              onChange={(e) => setCond(i, { value: Number(e.target.value) })}
              className="num w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
            />
            <button
              onClick={() => setConds((prev) => prev.filter((_, j) => j !== i))}
              className="px-1 text-[var(--text-faint)] hover:text-[var(--up)]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setConds((prev) => [...prev, { metric: "per", op: "<", value: 15 }])}
          className="rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--accent)]"
        >
          + 조건 추가
        </button>
        <button
          onClick={save}
          disabled={pending || !name.trim() || conds.length === 0}
          className="ml-auto rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        {rule.id && (
          <button
            onClick={() => {
              if (confirm("이 룰을 삭제할까요?")) {
                startTransition(async () => {
                  await deleteRuleAction(rule.id!);
                  router.refresh();
                });
              }
            }}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--up)] hover:text-[var(--up)]"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

export function NewRuleButton() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--text)]"
      >
        + 새 룰 만들기
      </button>
    );
  }
  return (
    <RuleEditor
      rule={{ name: "", definition: [{ metric: "per", op: "<", value: 15 }], enabled: true }}
      onDone={() => setOpen(false)}
    />
  );
}
