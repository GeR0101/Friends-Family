import { getDb } from "@/app/lib/db";

export type ContactStatus = "pending" | "accepted";

/**
 * Send (or resolve) a contact request from `requester` to `target` by name.
 * If the target already sent us a pending request, this accepts it instead.
 */
export async function requestContact(
  requesterName: string,
  targetName: string
): Promise<{ ok: true; status: ContactStatus } | { ok: false; error: string }> {
  const a = requesterName.trim().toLowerCase();
  const b = targetName.trim().toLowerCase();
  if (!b) return { ok: false, error: "Bitte einen Namen eingeben" };
  if (a === b) return { ok: false, error: "Du kannst dich nicht selbst hinzufügen" };

  const db = await getDb();
  const acc = await db.execute({
    sql: "SELECT name FROM accounts WHERE name_lower = ?",
    args: [b],
  });
  if (!acc.rows[0]) return { ok: false, error: "Kein Konto mit diesem Namen gefunden" };

  const existing = await db.execute({
    sql: `SELECT requester_lower, addressee_lower, status FROM contacts
          WHERE (requester_lower = ? AND addressee_lower = ?)
             OR (requester_lower = ? AND addressee_lower = ?)`,
    args: [a, b, b, a],
  });
  const rows = existing.rows;
  if (rows.some((r) => String(r.status) === "accepted")) {
    return { ok: false, error: "Ihr seid schon verbunden" };
  }
  // The other person already invited us → just accept.
  const reverse = rows.find(
    (r) => String(r.requester_lower) === b && String(r.status) === "pending"
  );
  if (reverse) {
    await db.execute({
      sql: "UPDATE contacts SET status = 'accepted' WHERE requester_lower = ? AND addressee_lower = ?",
      args: [b, a],
    });
    return { ok: true, status: "accepted" };
  }
  // We already have a pending request out to them.
  if (rows.some((r) => String(r.requester_lower) === a)) {
    return { ok: true, status: "pending" };
  }
  await db.execute({
    sql: "INSERT INTO contacts (requester_lower, addressee_lower, status, created_at) VALUES (?, ?, 'pending', ?)",
    args: [a, b, Date.now()],
  });
  return { ok: true, status: "pending" };
}

/** Accept or decline a pending request that was sent TO `me`. */
export async function respondContact(
  meName: string,
  requesterName: string,
  accept: boolean
): Promise<{ ok: true }> {
  const me = meName.trim().toLowerCase();
  const req = requesterName.trim().toLowerCase();
  const db = await getDb();
  if (accept) {
    await db.execute({
      sql: "UPDATE contacts SET status = 'accepted' WHERE requester_lower = ? AND addressee_lower = ? AND status = 'pending'",
      args: [req, me],
    });
  } else {
    await db.execute({
      sql: "DELETE FROM contacts WHERE requester_lower = ? AND addressee_lower = ? AND status = 'pending'",
      args: [req, me],
    });
  }
  return { ok: true };
}

/** Remove a connection (either direction). */
export async function removeContact(meName: string, otherName: string): Promise<{ ok: true }> {
  const me = meName.trim().toLowerCase();
  const o = otherName.trim().toLowerCase();
  const db = await getDb();
  await db.execute({
    sql: `DELETE FROM contacts
          WHERE (requester_lower = ? AND addressee_lower = ?)
             OR (requester_lower = ? AND addressee_lower = ?)`,
    args: [me, o, o, me],
  });
  return { ok: true };
}

/** Lowercased names of a user's accepted contacts. */
export async function contactLowersOf(meName: string): Promise<string[]> {
  const me = meName.trim().toLowerCase();
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT requester_lower, addressee_lower FROM contacts
          WHERE status = 'accepted' AND (requester_lower = ? OR addressee_lower = ?)`,
    args: [me, me],
  });
  return rs.rows.map((r) => {
    const a = String(r.requester_lower);
    return a === me ? String(r.addressee_lower) : a;
  });
}

/** Lowercased names of people who sent `me` a pending request. */
export async function incomingLowersOf(meName: string): Promise<string[]> {
  const me = meName.trim().toLowerCase();
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT requester_lower FROM contacts WHERE status = 'pending' AND addressee_lower = ?",
    args: [me],
  });
  return rs.rows.map((r) => String(r.requester_lower));
}

/** Lowercased names `me` has a pending request out to. */
export async function outgoingLowersOf(meName: string): Promise<string[]> {
  const me = meName.trim().toLowerCase();
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT addressee_lower FROM contacts WHERE status = 'pending' AND requester_lower = ?",
    args: [me],
  });
  return rs.rows.map((r) => String(r.addressee_lower));
}
