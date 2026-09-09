import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

export const mindmitraMemories = mysqlTable("mindmitra_memories", {
  id: int("id").autoincrement().primaryKey(),
  ownerKey: varchar("ownerKey", { length: 128 }).notNull(),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  memoryDate: varchar("memoryDate", { length: 64 }).notNull(),
  memoryTime: varchar("memoryTime", { length: 32 }),
  language: varchar("language", { length: 16 }),
  source: varchar("source", { length: 16 }).default("typed").notNull(),
  pinned: int("pinned").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  ownerExternalIdx: uniqueIndex("mindmitra_owner_external_idx").on(table.ownerKey, table.externalId),
}));

export const mindmitraActivities = mysqlTable("mindmitra_activities", {
  id: int("id").autoincrement().primaryKey(),
  ownerKey: varchar("ownerKey", { length: 128 }).notNull(),
  activityType: varchar("activityType", { length: 64 }).notNull(),
  memoryExternalId: varchar("memoryExternalId", { length: 128 }),
  game: varchar("game", { length: 32 }),
  score: int("score"),
  accuracy: int("accuracy"),
  language: varchar("language", { length: 16 }),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

export type MindMitraMemory = typeof mindmitraMemories.$inferSelect;
export type InsertMindMitraMemory = typeof mindmitraMemories.$inferInsert;
export type MindMitraActivity = typeof mindmitraActivities.$inferSelect;
export type InsertMindMitraActivity = typeof mindmitraActivities.$inferInsert;
