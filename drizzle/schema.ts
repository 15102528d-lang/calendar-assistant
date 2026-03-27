import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
 * Upload records - tracks each file upload session
 */
export const uploadRecords = mysqlTable("upload_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileType: varchar("fileType", { length: 64 }).notNull(), // text, image, pdf
  fileSize: int("fileSize").notNull(),
  fileUrl: text("fileUrl"), // S3 URL for images/PDFs
  fileKey: varchar("fileKey", { length: 512 }), // S3 key
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  rawText: text("rawText"), // extracted text from OCR/PDF
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UploadRecord = typeof uploadRecords.$inferSelect;
export type InsertUploadRecord = typeof uploadRecords.$inferInsert;

/**
 * Extracted events from recognition
 */
export const extractedEvents = mysqlTable("extracted_events", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("uploadId").notNull(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 32 }), // YYYY-MM-DD
  startTime: varchar("startTime", { length: 16 }), // HH:mm
  endTime: varchar("endTime", { length: 16 }), // HH:mm
  title: text("title"),
  location: text("location"),
  startLocation: text("startLocation"),
  endLocation: text("endLocation"),
  notes: text("notes"),
  confidence: int("confidence").default(100), // 0-100 confidence score
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExtractedEvent = typeof extractedEvents.$inferSelect;
export type InsertExtractedEvent = typeof extractedEvents.$inferInsert;

/**
 * Calendar shares - stores generated ICS for sharing
 */
export const calendarShares = mysqlTable("calendar_shares", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  shareId: varchar("shareId", { length: 64 }).notNull().unique(),
  icsContent: text("icsContent").notNull(),
  eventCount: int("eventCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type CalendarShare = typeof calendarShares.$inferSelect;
export type InsertCalendarShare = typeof calendarShares.$inferInsert;
