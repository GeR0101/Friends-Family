import crypto from "crypto";
import type { Row } from "@libsql/client";
import { type Location, resolveLocation } from "@/app/lib/cities";
import { getDb } from "@/app/lib/db";

export interface Account {
  name: string;
  salt: string;
  hash: string;
  location: Location;
  createdAt: number;
}

export interface PublicAccount {
  name: string;
  location: Location;
  createdAt: number;
}

function rowToAccount(r: Row): Account {
  const loc = resolveLocation(JSON.parse(String(r.location)));
  return {
    name: String(r.name),
    salt: String(r.salt),
    hash: String(r.hash),
    location: loc || resolveLocation("austria")!,
    createdAt: Number(r.created_at),
  };
}

export async function readAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT name, salt, hash, location, created_at FROM accounts ORDER BY created_at ASC"
  );
  return rs.rows.map(rowToAccount);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

export function toPublic(a: Account): PublicAccount {
  return { name: a.name, location: a.location, createdAt: a.createdAt };
}

/** Case-insensitive lookup so "Mama" and "mama" are the same account. */
export async function findAccount(name: string): Promise<Account | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT name, salt, hash, location, created_at FROM accounts WHERE name_lower = ?",
    args: [name.trim().toLowerCase()],
  });
  return rs.rows[0] ? rowToAccount(rs.rows[0]) : undefined;
}

export async function createAccount(
  name: string,
  password: string,
  location: Location
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Name muss mindestens 2 Buchstaben haben" };
  }
  if (password.length < 4) {
    return { ok: false, error: "Passwort muss mindestens 4 Zeichen haben" };
  }
  if (!location || !location.tz) {
    return { ok: false, error: "Bitte wähle deinen Ort aus" };
  }

  const existing = await findAccount(trimmed);
  if (existing) {
    return { ok: false, error: "Diesen Namen gibt es schon – bitte einloggen" };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const account: Account = {
    name: trimmed,
    salt,
    hash: hashPassword(password, salt),
    location,
    createdAt: Date.now(),
  };

  const db = await getDb();
  try {
    await db.execute({
      sql: "INSERT INTO accounts (name_lower, name, salt, hash, location, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        trimmed.toLowerCase(),
        account.name,
        account.salt,
        account.hash,
        JSON.stringify(account.location),
        account.createdAt,
      ],
    });
  } catch {
    // Unique constraint race → treat as "name taken".
    return { ok: false, error: "Diesen Namen gibt es schon – bitte einloggen" };
  }

  return { ok: true, account: toPublic(account) };
}

export async function verifyLogin(
  name: string,
  password: string
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  const account = await findAccount(name);
  if (!account) {
    return { ok: false, error: "Kein Account mit diesem Namen gefunden" };
  }
  const hash = hashPassword(password, account.salt);
  if (hash !== account.hash) {
    return { ok: false, error: "Falsches Passwort" };
  }
  return { ok: true, account: toPublic(account) };
}
