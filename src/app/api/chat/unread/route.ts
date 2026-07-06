import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { unreadForUser, markRead } from "@/app/lib/reads";

// Unread summary for a user: per-contact counts + a grand total for the badge.
export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");
  if (!user) return NextResponse.json({ error: "user is required" }, { status: 400 });
  try {
    const db = await getDb();
    return NextResponse.json(await unreadForUser(db, user));
  } catch (error) {
    console.error("Unread GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Mark a conversation as read up to now (or a given ts). Returns the fresh
// summary so the client can update badges immediately.
export async function POST(req: NextRequest) {
  try {
    const { user, conversationId, ts } = await req.json();
    if (!user || !conversationId) {
      return NextResponse.json(
        { error: "user and conversationId are required" },
        { status: 400 }
      );
    }
    const db = await getDb();
    await markRead(db, user, conversationId, typeof ts === "number" ? ts : Date.now());
    return NextResponse.json(await unreadForUser(db, user));
  } catch (error) {
    console.error("Unread POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
