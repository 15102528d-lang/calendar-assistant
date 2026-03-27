import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  uploadRecords, InsertUploadRecord, UploadRecord,
  extractedEvents, InsertExtractedEvent, ExtractedEvent,
  calendarShares, InsertCalendarShare, CalendarShare,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ───────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Upload Record Helpers ──────────────────────────────────────────────────

export async function createUploadRecord(record: InsertUploadRecord): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(uploadRecords).values(record);
  return result[0].insertId;
}

export async function updateUploadRecord(id: number, data: Partial<InsertUploadRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(uploadRecords).set(data).where(eq(uploadRecords.id, id));
}

export async function getUploadRecordsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(uploadRecords).where(eq(uploadRecords.userId, userId)).orderBy(desc(uploadRecords.createdAt));
}

export async function getUploadRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(uploadRecords).where(eq(uploadRecords.id, id)).limit(1);
  return result[0];
}

// ─── Extracted Event Helpers ────────────────────────────────────────────────

export async function createExtractedEvents(events: InsertExtractedEvent[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (events.length === 0) return;
  await db.insert(extractedEvents).values(events);
}

export async function getEventsByUploadId(uploadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(extractedEvents).where(eq(extractedEvents.uploadId, uploadId));
}

export async function getEventsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(extractedEvents).where(eq(extractedEvents.userId, userId)).orderBy(desc(extractedEvents.createdAt));
}

export async function updateExtractedEvent(id: number, data: Partial<InsertExtractedEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(extractedEvents).set(data).where(eq(extractedEvents.id, id));
}

export async function deleteExtractedEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(extractedEvents).where(eq(extractedEvents.id, id));
}

// ─── Calendar Share Helpers ─────────────────────────────────────────────────

export async function createCalendarShare(share: InsertCalendarShare): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(calendarShares).values(share);
}

export async function getCalendarShareById(shareId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(calendarShares).where(eq(calendarShares.shareId, shareId)).limit(1);
  return result[0];
}

export async function getCalendarSharesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarShares).where(eq(calendarShares.userId, userId)).orderBy(desc(calendarShares.createdAt));
}
