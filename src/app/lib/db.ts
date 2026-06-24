import { createClient, type Client } from "@libsql/client";
import { promises as fs } from "fs";
import path from "path";
import { resolveLocation } from "./cities";

// ── Connection ──────────────────────────────────────────────────────────────
// Production (Vercel): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
// Local dev (no env): falls back to an on-disk SQLite file so everything keeps
// working without any setup.
// True when no Turso URL is configured — we use a local SQLite file and seed it
// from the old JSON files for dev continuity. Against a real Turso DB we never
// seed, so production starts clean.
const isLocalFile = !process.env.TURSO_DATABASE_URL;

function rawClient(): Client {
  const url = process.env.TURSO_DATABASE_URL || "file:.data/local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

let initPromise: Promise<Client> | null = null;

/** Returns a ready-to-use client with the schema created (and, locally, seeded). */
export function getDb(): Promise<Client> {
  if (!initPromise) {
    const db = rawClient();
    initPromise = (async () => {
      await ensureSchema(db);
      if (isLocalFile) await seedLegacy(db);
      return db;
    })().catch((err) => {
      // Reset so a transient failure (e.g. cold Turso) can retry on next call.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

// ── Schema ──────────────────────────────────────────────────────────────────
async function ensureSchema(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS accounts (
      name_lower TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      salt       TEXT NOT NULL,
      hash       TEXT NOT NULL,
      location   TEXT NOT NULL,
      avatar     TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      user            TEXT NOT NULL,
      text            TEXT NOT NULL,
      timezone        TEXT,
      timestamp       INTEGER NOT NULL,
      conversation_id TEXT NOT NULL DEFAULT 'group',
      meeting_proposal TEXT,
      room_invite      TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, timestamp);
    CREATE TABLE IF NOT EXISTS presence (
      name_lower TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      timezone   TEXT,
      online     INTEGER NOT NULL DEFAULT 0,
      last_seen  INTEGER NOT NULL
    );
  `);

  // Migrate older accounts tables that predate the avatar column.
  const cols = await db.execute("PRAGMA table_info(accounts)");
  if (!cols.rows.some((r) => String(r.name) === "avatar")) {
    await db.execute("ALTER TABLE accounts ADD COLUMN avatar TEXT");
  }
}

// ── One-time seeding from the old JSON files ─────────────────────────────────
// Harmless on Vercel/Turso where the files don't exist; on the local box it
// carries over existing accounts and message history into the new store.
async function readJsonFile<T>(rel: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), rel), "utf-8")) as T;
  } catch {
    return null;
  }
}

async function isEmpty(db: Client, table: string): Promise<boolean> {
  const rs = await db.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(rs.rows[0].n) === 0;
}

async function seedLegacy(db: Client) {
  if (await isEmpty(db, "accounts")) {
    const raw = await readJsonFile<
      Array<{ name: string; salt: string; hash: string; location?: unknown; timezone?: string; createdAt?: number }>
    >(".data/accounts.json");
    if (raw?.length) {
      await db.batch(
        raw.map((a) => ({
          sql:
            "INSERT OR IGNORE INTO accounts (name_lower, name, salt, hash, location, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          args: [
            a.name.toLowerCase(),
            a.name,
            a.salt,
            a.hash,
            JSON.stringify(resolveLocation(a.location ?? a.timezone) || resolveLocation("austria")),
            a.createdAt ?? Date.now(),
          ],
        })),
        "write"
      );
    }
  }

  if (await isEmpty(db, "messages")) {
    const raw = await readJsonFile<
      Array<{
        id: string;
        user: string;
        text?: string;
        timezone?: string;
        timestamp?: number;
        conversationId?: string;
        meetingProposal?: unknown;
        roomInvite?: unknown;
      }>
    >(".data/messages.json");
    if (raw?.length) {
      await db.batch(
        raw.map((m) => ({
          sql:
            "INSERT OR IGNORE INTO messages (id, user, text, timezone, timestamp, conversation_id, meeting_proposal, room_invite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [
            m.id,
            m.user,
            m.text ?? "",
            m.timezone ?? null,
            m.timestamp ?? Date.now(),
            m.conversationId ?? "group",
            m.meetingProposal ? JSON.stringify(m.meetingProposal) : null,
            m.roomInvite ? JSON.stringify(m.roomInvite) : null,
          ],
        })),
        "write"
      );
    }
  }
}
