import { NextResponse } from "next/server";
import { readAccounts, toPublic } from "@/lib/accounts";
import { getDb } from "@/app/lib/db";

const ONLINE_WINDOW_MS = 30 * 1000;

export async function GET() {
  const accounts = await readAccounts();

  const db = await getDb();
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const rs = await db.execute({
    sql: "SELECT name_lower, last_seen FROM presence WHERE online = 1 AND last_seen >= ?",
    args: [cutoff],
  });
  const presence = new Map<string, number>(
    rs.rows.map((r) => [String(r.name_lower), Number(r.last_seen)])
  );

  const users = accounts.map((a) => {
    const lastSeen = presence.get(a.name.toLowerCase());
    return {
      ...toPublic(a),
      online: lastSeen !== undefined,
      lastSeen: lastSeen ?? 0,
    };
  });

  return NextResponse.json({ users });
}
