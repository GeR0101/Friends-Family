import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

interface OnlineUser {
  name: string;
  timezone: string;
  online: boolean;
  lastSeen: number;
}

const FIVE_MINUTES = 5 * 60 * 1000;

async function listOnline(): Promise<OnlineUser[]> {
  const db = await getDb();
  const cutoff = Date.now() - FIVE_MINUTES;
  // Drop stale rows, then return who's currently online.
  await db.execute({ sql: "DELETE FROM presence WHERE last_seen < ?", args: [cutoff] });
  const rs = await db.execute({
    sql: "SELECT name, timezone, online, last_seen FROM presence WHERE online = 1 AND last_seen >= ?",
    args: [cutoff],
  });
  return rs.rows.map((r) => ({
    name: String(r.name),
    timezone: r.timezone == null ? "austria" : String(r.timezone),
    online: true,
    lastSeen: Number(r.last_seen),
  }));
}

export async function GET() {
  return NextResponse.json({ users: await listOnline() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, timezone, online } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const db = await getDb();
    if (online) {
      await db.execute({
        sql: `INSERT INTO presence (name_lower, name, timezone, online, last_seen)
              VALUES (?, ?, ?, 1, ?)
              ON CONFLICT(name_lower) DO UPDATE SET
                name = excluded.name,
                timezone = COALESCE(excluded.timezone, presence.timezone),
                online = 1,
                last_seen = excluded.last_seen`,
        args: [String(name).toLowerCase(), name, timezone || "austria", Date.now()],
      });
    } else {
      await db.execute({
        sql: "DELETE FROM presence WHERE name_lower = ?",
        args: [String(name).toLowerCase()],
      });
    }

    return NextResponse.json({ users: await listOnline() });
  } catch (error) {
    console.error("Users API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
