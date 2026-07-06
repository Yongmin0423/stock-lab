import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** lazy 초기화 — DATABASE_URL 없이도 빌드/모의 모드가 동작하도록 */
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("NO_DATABASE_URL");
  }
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL, {
      prepare: false, // Supabase pooler(트랜잭션 모드) 필수
      max: 5,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}
