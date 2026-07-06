import { asc, eq } from "drizzle-orm";
import defaultRules from "../../../../config/rules.json";
import { getDb } from "@/lib/db";
import { rules } from "@/lib/db/schema";

export type RuleRow = typeof rules.$inferSelect;

/** 룰 목록. 비어 있으면 config/rules.json에서 기본 룰 자동 시드 */
export async function listRules(): Promise<RuleRow[]> {
  const db = getDb();
  const rows = await db.select().from(rules).orderBy(asc(rules.id));
  if (rows.length > 0) return rows;

  await db.insert(rules).values(
    (defaultRules as Array<{ name: string; rules: Array<{ metric: string; op: string; value: number }> }>).map(
      (r) => ({ name: r.name, definition: r.rules, enabled: true }),
    ),
  );
  return db.select().from(rules).orderBy(asc(rules.id));
}

export async function listEnabledRules(): Promise<RuleRow[]> {
  return (await listRules()).filter((r) => r.enabled);
}

export async function saveRule(data: {
  id?: number;
  name: string;
  definition: Array<{ metric: string; op: string; value: number }>;
  enabled: boolean;
}) {
  const db = getDb();
  if (data.id) {
    await db
      .update(rules)
      .set({ name: data.name, definition: data.definition, enabled: data.enabled })
      .where(eq(rules.id, data.id));
    return;
  }
  await db.insert(rules).values(data);
}

export async function deleteRule(id: number) {
  const db = getDb();
  await db.delete(rules).where(eq(rules.id, id));
}
