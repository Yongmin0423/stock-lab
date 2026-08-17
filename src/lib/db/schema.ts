import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 서비스화 대비 메모 (기획서 §11.4): user_id는 지금 넣지 않되,
// 모든 쿼리를 queries/ 폴더에 모아 나중에 한 곳만 수정하면 되게 유지한다.

export const stocks = pgTable("stocks", {
  symbol: text("symbol").primaryKey(), // "US:AAPL" | "KR:005930"
  name: text("name").notNull(),
  market: text("market", { enum: ["US", "KR"] }).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

/** 종목당 1행 유지 (이력은 candles 담당) → 캐시 로직 단순화 */
export const quotes = pgTable("quotes", {
  stockSymbol: text("stock_symbol")
    .primaryKey()
    .references(() => stocks.symbol, { onDelete: "cascade" }),
  price: real("price").notNull(),
  changePct: real("change_pct").notNull(),
  fetchedAt: timestamp("fetched_at").notNull(),
});

export const candles = pgTable(
  "candles",
  {
    id: serial("id").primaryKey(),
    stockSymbol: text("stock_symbol")
      .notNull()
      .references(() => stocks.symbol, { onDelete: "cascade" }),
    date: date("date").notNull(),
    open: real("open"),
    high: real("high"),
    low: real("low"),
    close: real("close").notNull(),
    volume: real("volume"),
  },
  (t) => [uniqueIndex("candles_sym_date").on(t.stockSymbol, t.date)],
);

export const financials = pgTable("financials", {
  stockSymbol: text("stock_symbol")
    .primaryKey()
    .references(() => stocks.symbol, { onDelete: "cascade" }),
  per: real("per"),
  pbr: real("pbr"),
  eps: real("eps"),
  roe: real("roe"),
  debtToEquity: real("debt_to_equity"),
  dividendYield: real("dividend_yield"),
  marketCap: real("market_cap"),
  w52High: real("w52_high"),
  w52Low: real("w52_low"),
  fetchedAt: timestamp("fetched_at").notNull(),
});

export const news = pgTable(
  "news",
  {
    id: serial("id").primaryKey(),
    stockSymbol: text("stock_symbol")
      .notNull()
      .references(() => stocks.symbol, { onDelete: "cascade" }),
    headline: text("headline").notNull(),
    source: text("source"),
    url: text("url").notNull().unique(),
    publishedAt: timestamp("published_at"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(), // 1h TTL 판단용
    // AI 평가 (수집 시 Haiku 배치 — 키 없으면 null 유지)
    sentiment: text("sentiment", { enum: ["호재", "악재", "중립"] }),
    importance: integer("importance"), // 1~3
    aiNote: text("ai_note"), // 내 원칙과의 관련성 한 줄
  },
  (t) => [index("news_stock_published_idx").on(t.stockSymbol, t.publishedAt.desc())],
);

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().notNull().default([]),
  source: text("source"),
  relatedSymbols: text("related_symbols").array().notNull().default([]),
  aiReview: jsonb("ai_review").$type<{
    factual_issues: string[];
    overgeneralizations: string[];
    counterexamples: string[];
    suggestions: string[];
    overall: string;
  }>(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analyses = pgTable(
  "analyses",
  {
    id: serial("id").primaryKey(),
    stockSymbol: text("stock_symbol")
      .notNull()
      .references(() => stocks.symbol, { onDelete: "cascade" }),
    verdict: text("verdict", { enum: ["매수검토", "관망", "회피"] }).notNull(),
    confidence: integer("confidence"),
    reasons: jsonb("reasons").$type<string[]>(),
    risks: jsonb("risks").$type<string[]>(),
    challenges: jsonb("challenges").$type<string[]>(),
    citedNoteIds: integer("cited_note_ids").array().notNull().default([]),
    priceAtAnalysis: real("price_at_analysis"),
    trigger: text("trigger", { enum: ["manual", "briefing"] })
      .notNull()
      .default("manual"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("analyses_stock_created_idx").on(t.stockSymbol, t.createdAt.desc())],
);

export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  definition: jsonb("definition").$type<Array<{ metric: string; op: string; value: number }>>().notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const briefings = pgTable("briefings", {
  id: serial("id").primaryKey(),
  slot: text("slot", { enum: ["morning", "evening"] }).notNull(),
  marketSummary: text("market_summary"),
  stockSections: jsonb("stock_sections").$type<Array<{ symbol: string; name: string; changePct: number | null; summary: string }>>(),
  watchItems: jsonb("watch_items").$type<Array<{ symbol: string; name: string; reason: string; basis: string }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kisTokens = pgTable("kis_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

/** 발굴(추천) 결과 — 최신 결과를 대시보드·/discover에 상시 표시 */
export const discoveries = pgTable("discoveries", {
  id: serial("id").primaryKey(),
  picks: jsonb("picks").$type<
    Array<{ symbol: string; name: string; fit_score: number; reason: string; cited: string; caution: string }>
  >().notNull(),
  scannedCount: integer("scanned_count"),
  candidateCount: integer("candidate_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** DART 고유번호 매핑 (종목코드 ↔ corp_code) — scripts/load-dart-corpcodes.mjs로 적재 */
export const dartCorpCodes = pgTable("dart_corp_codes", {
  stockCode: text("stock_code").primaryKey(), // "005930"
  corpCode: text("corp_code").notNull(), // DART 8자리 고유번호
});

/** 종목 마스터 — KR은 scripts/load-krx-master.mjs로 적재, US 대형주는 자동 시드 */
export const stocksMaster = pgTable("stocks_master", {
  code: text("code").primaryKey(), // "005930" | "AAPL"
  name: text("name").notNull(),
  market: text("market", { enum: ["US", "KR"] }).notNull().default("KR"),
});

/** 넓은 발굴 유니버스용 재무 캐시 — watchlist와 독립 */
export const screeningFundamentals = pgTable("screening_fundamentals", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  market: text("market", { enum: ["US", "KR"] }).notNull(),
  per: real("per"),
  pbr: real("pbr"),
  eps: real("eps"),
  roe: real("roe"),
  debtToEquity: real("debt_to_equity"),
  dividendYield: real("dividend_yield"),
  marketCap: real("market_cap"),
  fetchedAt: timestamp("fetched_at").notNull(),
});
