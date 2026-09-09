import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertMindMitraActivity, InsertMindMitraMemory, mindmitraActivities, mindmitraMemories, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
    const values: InsertUser = {
      openId: user.openId,
    };
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listMindMitraMemories(ownerKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mindmitraMemories).where(eq(mindmitraMemories.ownerKey, ownerKey)).orderBy(desc(mindmitraMemories.createdAt));
}

export async function upsertMindMitraMemory(memory: InsertMindMitraMemory) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(mindmitraMemories).values(memory).onDuplicateKeyUpdate({
    set: {
      title: memory.title,
      description: memory.description,
      category: memory.category,
      memoryDate: memory.memoryDate,
      memoryTime: memory.memoryTime ?? null,
      language: memory.language ?? null,
      source: memory.source ?? "typed",
      pinned: memory.pinned ?? 0,
    },
  });
  return true;
}

export async function deleteMindMitraMemory(ownerKey: string, externalId: string) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(mindmitraMemories).where(and(eq(mindmitraMemories.ownerKey, ownerKey), eq(mindmitraMemories.externalId, externalId)));
  return true;
}

export async function recordMindMitraActivity(activity: InsertMindMitraActivity) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(mindmitraActivities).values(activity);
  return true;
}

export async function getMindMitraActivity(ownerKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mindmitraActivities).where(eq(mindmitraActivities.ownerKey, ownerKey)).orderBy(desc(mindmitraActivities.occurredAt));
}
