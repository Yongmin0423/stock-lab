import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" }); // Next.js와 동일한 env 파일 사용

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
