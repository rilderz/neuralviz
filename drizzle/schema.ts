import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, float, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Trading Models - stores trained LSTM models and their metadata
 */
export const tradingModels = mysqlTable("trading_models", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  modelType: varchar("modelType", { length: 50 }).notNull(),
  version: int("version").default(1).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }),
  winRate: decimal("winRate", { precision: 5, scale: 4 }),
  profitFactor: decimal("profitFactor", { precision: 8, scale: 4 }),
  modelPath: text("modelPath"),
  hyperparameters: json("hyperparameters"),
  trainingMetrics: json("trainingMetrics"),
  status: mysqlEnum("status", ["training", "active", "archived"]).default("training"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingModel = typeof tradingModels.$inferSelect;
export type InsertTradingModel = typeof tradingModels.$inferInsert;

/**
 * Trades - individual trade records
 */
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  modelId: int("modelId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: mysqlEnum("side", ["BUY", "SELL"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 12, scale: 6 }).notNull(),
  exitPrice: decimal("exitPrice", { precision: 12, scale: 6 }),
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  stopLoss: decimal("stopLoss", { precision: 12, scale: 6 }).notNull(),
  takeProfit: decimal("takeProfit", { precision: 12, scale: 6 }),
  riskAmount: decimal("riskAmount", { precision: 12, scale: 2 }).notNull(),
  profitLoss: decimal("profitLoss", { precision: 12, scale: 2 }),
  profitLossPercent: decimal("profitLossPercent", { precision: 8, scale: 4 }),
  status: mysqlEnum("status", ["open", "closed", "cancelled"]).default("open"),
  reason: varchar("reason", { length: 255 }),
  entryTime: timestamp("entryTime").notNull(),
  exitTime: timestamp("exitTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Trading Sessions - backtesting and live trading sessions
 */
export const tradingSessions = mysqlTable("trading_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  modelId: int("modelId").notNull(),
  sessionType: mysqlEnum("sessionType", ["backtest", "live", "simulation"]).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  initialCapital: decimal("initialCapital", { precision: 12, scale: 2 }).notNull(),
  finalBalance: decimal("finalBalance", { precision: 12, scale: 2 }),
  totalTrades: int("totalTrades").default(0),
  winningTrades: int("winningTrades").default(0),
  losingTrades: int("losingTrades").default(0),
  winRate: decimal("winRate", { precision: 5, scale: 4 }),
  totalProfit: decimal("totalProfit", { precision: 12, scale: 2 }),
  totalReturn: decimal("totalReturn", { precision: 8, scale: 4 }),
  maxDrawdown: decimal("maxDrawdown", { precision: 8, scale: 4 }),
  sharpeRatio: float("sharpeRatio"),
  profitFactor: decimal("profitFactor", { precision: 8, scale: 4 }),
  status: mysqlEnum("status", ["running", "completed", "stopped"]).default("running"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingSession = typeof tradingSessions.$inferSelect;
export type InsertTradingSession = typeof tradingSessions.$inferInsert;

/**
 * Price Data - historical forex prices for training and backtesting
 */
export const priceData = mysqlTable("price_data", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 12, scale: 6 }).notNull(),
  high: decimal("high", { precision: 12, scale: 6 }).notNull(),
  low: decimal("low", { precision: 12, scale: 6 }).notNull(),
  close: decimal("close", { precision: 12, scale: 6 }).notNull(),
  volume: int("volume"),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
});

export type PriceData = typeof priceData.$inferSelect;
export type InsertPriceData = typeof priceData.$inferInsert;