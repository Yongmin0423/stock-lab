"use server";

import { revalidatePath } from "next/cache";
import { deleteStock, insertStock } from "@/lib/db/queries/stocks";
import type { Market } from "@/lib/providers/types";

export async function addStockAction(symbol: string, name: string, market: Market) {
  await insertStock(symbol, name, market);
  revalidatePath("/");
}

export async function removeStockAction(symbol: string) {
  await deleteStock(symbol);
  revalidatePath("/");
}

export async function saveNoteAction(formData: FormData) {
  const { upsertNote } = await import("@/lib/db/queries/notes");
  const { redirect } = await import("next/navigation");

  const idRaw = formData.get("id");
  const parseList = (v: FormDataEntryValue | null) =>
    String(v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return; // 최소 검증

  await upsertNote({
    id: idRaw ? Number(idRaw) : undefined,
    title,
    content,
    tags: parseList(formData.get("tags")),
    source: String(formData.get("source") ?? "").trim() || null,
    relatedSymbols: parseList(formData.get("relatedSymbols")).map((s) => s.toUpperCase()),
  });

  revalidatePath("/notes");
  redirect("/notes");
}

export async function deleteNoteAction(id: number) {
  const { removeNote } = await import("@/lib/db/queries/notes");
  const { redirect } = await import("next/navigation");
  await removeNote(id);
  revalidatePath("/notes");
  redirect("/notes");
}

export async function saveRuleAction(data: {
  id?: number;
  name: string;
  definition: Array<{ metric: string; op: string; value: number }>;
  enabled: boolean;
}) {
  const { saveRule } = await import("@/lib/db/queries/rules");
  if (!data.name.trim() || data.definition.length === 0) return;
  await saveRule({ ...data, name: data.name.trim() });
  revalidatePath("/settings");
}

export async function deleteRuleAction(id: number) {
  const { deleteRule } = await import("@/lib/db/queries/rules");
  await deleteRule(id);
  revalidatePath("/settings");
}
