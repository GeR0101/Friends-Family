import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

// List the ad-hoc group conversations a user takes part in, newest first.
// Membership is encoded in the conversation id ("grp:a~b~c").
export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");
  if (!user) {
    return NextResponse.json({ error: "user is required" }, { status: 400 });
  }
  const me = user.toLowerCase();
  try {
    const db = await getDb();
    const rs = await db.execute(
      `SELECT conversation_id, MAX(timestamp) AS last_ts, COUNT(*) AS n
       FROM messages
       WHERE conversation_id LIKE 'grp:%'
       GROUP BY conversation_id
       ORDER BY last_ts DESC`
    );
    const groups = rs.rows
      .map((r) => {
        const id = String(r.conversation_id);
        const members = id.slice(4).split("~").filter(Boolean);
        return { id, members, lastTs: Number(r.last_ts) };
      })
      .filter((g) => g.members.includes(me));
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Conversations API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
