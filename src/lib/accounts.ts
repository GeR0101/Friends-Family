import crypto from "crypto";
import type { Row } from "@libsql/client";
import { type Location, resolveLocation } from "@/app/lib/cities";
import { getDb } from "@/app/lib/db";

export interface Account {
  name: string;
  salt: string;
  hash: string;
  location: Location;
  avatar?: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  createdAt: number;
}

export interface PublicAccount {
  name: string;
  location: Location;
  avatar?: string;
  hasSecurityQuestion: boolean;
  createdAt: number;
}

function rowToAccount(r: Row): Account {
  const loc = resolveLocation(JSON.parse(String(r.location)));
  return {
    name: String(r.name),
    salt: String(r.salt),
    hash: String(r.hash),
    location: loc || resolveLocation("austria")!,
    avatar: r.avatar == null ? undefined : String(r.avatar),
    securityQuestion: r.security_question == null ? undefined : String(r.security_question),
    securityAnswerHash: r.security_answer_hash == null ? undefined : String(r.security_answer_hash),
    createdAt: Number(r.created_at),
  };
}

const COLS =
  "name, salt, hash, location, avatar, security_question, security_answer_hash, created_at";

export async function readAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rs = await db.execute(`SELECT ${COLS} FROM accounts ORDER BY created_at ASC`);
  return rs.rows.map(rowToAccount);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

// Security answers are matched case-/whitespace-insensitively.
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}
function hashAnswer(answer: string, salt: string): string {
  return crypto.scryptSync(normalizeAnswer(answer), salt, 32).toString("hex");
}

export function toPublic(a: Account): PublicAccount {
  return {
    name: a.name,
    location: a.location,
    avatar: a.avatar,
    hasSecurityQuestion: !!a.securityQuestion,
    createdAt: a.createdAt,
  };
}

/** Case-insensitive lookup so "Mama" and "mama" are the same account. */
export async function findAccount(name: string): Promise<Account | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT ${COLS} FROM accounts WHERE name_lower = ?`,
    args: [name.trim().toLowerCase()],
  });
  return rs.rows[0] ? rowToAccount(rs.rows[0]) : undefined;
}

/** Set (or clear) a member's profile photo. Returns the updated public account. */
export async function setAvatar(
  name: string,
  avatar: string | null
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  const account = await findAccount(name);
  if (!account) {
    return { ok: false, error: "Account nicht gefunden" };
  }
  const db = await getDb();
  await db.execute({
    sql: "UPDATE accounts SET avatar = ? WHERE name_lower = ?",
    args: [avatar, name.trim().toLowerCase()],
  });
  return { ok: true, account: toPublic({ ...account, avatar: avatar ?? undefined }) };
}

export async function createAccount(
  name: string,
  password: string,
  location: Location,
  securityQuestion?: string,
  securityAnswer?: string
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
  const question = securityQuestion?.trim();
  const answer = securityAnswer?.trim();
  if (!question || !answer || answer.length < 2) {
    return { ok: false, error: "Bitte Sicherheitsfrage und Antwort angeben" };
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
    securityQuestion: question,
    securityAnswerHash: hashAnswer(answer, salt),
    createdAt: Date.now(),
  };

  const db = await getDb();
  try {
    await db.execute({
      sql: `INSERT INTO accounts (name_lower, name, salt, hash, location, security_question, security_answer_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        trimmed.toLowerCase(),
        account.name,
        account.salt,
        account.hash,
        JSON.stringify(account.location),
        account.securityQuestion!,
        account.securityAnswerHash!,
        account.createdAt,
      ],
    });
  } catch {
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

/** Public security question for a name (used to start a password reset). */
export async function getSecurityQuestion(name: string): Promise<string | null> {
  const account = await findAccount(name);
  return account?.securityQuestion ?? null;
}

/** Verify the security answer and set a new password. */
export async function resetPassword(
  name: string,
  answer: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const account = await findAccount(name);
  if (!account || !account.securityQuestion || !account.securityAnswerHash) {
    return { ok: false, error: "Für diesen Account ist keine Sicherheitsfrage hinterlegt" };
  }
  if (newPassword.length < 4) {
    return { ok: false, error: "Passwort muss mindestens 4 Zeichen haben" };
  }
  if (hashAnswer(answer, account.salt) !== account.securityAnswerHash) {
    return { ok: false, error: "Antwort stimmt nicht" };
  }
  const db = await getDb();
  await db.execute({
    sql: "UPDATE accounts SET hash = ? WHERE name_lower = ?",
    args: [hashPassword(newPassword, account.salt), name.trim().toLowerCase()],
  });
  return { ok: true };
}

/** Set/replace the security question (requires the current password). */
export async function setSecurityQuestion(
  name: string,
  password: string,
  question: string,
  answer: string
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  const account = await findAccount(name);
  if (!account) {
    return { ok: false, error: "Account nicht gefunden" };
  }
  if (hashPassword(password, account.salt) !== account.hash) {
    return { ok: false, error: "Falsches Passwort" };
  }
  const q = question.trim();
  const a = answer.trim();
  if (!q || !a || a.length < 2) {
    return { ok: false, error: "Bitte Frage und Antwort angeben" };
  }
  const db = await getDb();
  await db.execute({
    sql: "UPDATE accounts SET security_question = ?, security_answer_hash = ? WHERE name_lower = ?",
    args: [q, hashAnswer(a, account.salt), name.trim().toLowerCase()],
  });
  return {
    ok: true,
    account: toPublic({ ...account, securityQuestion: q, securityAnswerHash: hashAnswer(a, account.salt) }),
  };
}
