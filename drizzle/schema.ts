import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

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
  role: mysqlEnum("role", ["user", "admin", "analyst", "viewer"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Datasets table
export const datasets = mysqlTable("datasets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: int("ownerId").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize").notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // csv, xlsx, xls
  rowCount: int("rowCount"),
  columnCount: int("columnCount"),
  columnNames: json("columnNames"), // JSON array of column names
  isAnonymized: boolean("isAnonymized").default(false),
  piiColumns: json("piiColumns"), // JSON array of detected PII columns
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = typeof datasets.$inferInsert;

// Analysis history table
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  userId: int("userId").notNull(),
  query: text("query").notNull(),
  result: text("result"),
  chartType: varchar("chartType", { length: 50 }),
  chartConfig: json("chartConfig"), // Plotly chart configuration
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

// PII Detection log
export const piiDetectionLogs = mysqlTable("piiDetectionLogs", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  detectedColumns: json("detectedColumns"), // JSON array of detected PII columns
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium"),
  notified: boolean("notified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PiiDetectionLog = typeof piiDetectionLogs.$inferSelect;
export type InsertPiiDetectionLog = typeof piiDetectionLogs.$inferInsert;