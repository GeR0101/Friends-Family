import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

// Store (or refresh) a browser's push subscription for a user.
export async function POST(req: NextRequest) {
  try {
    const { user, subscription } = await req.json();
    if (!user || !subscription?.endpoint) {
      return NextResponse.json({ error: "user and subscription are required" }, { status: 400 });
    }
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO push_subscriptions (endpoint, user_lower, subscription, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET user_lower = excluded.user_lower, subscription = excluded.subscription`,
      args: [
        String(subscription.endpoint),
        String(user).toLowerCase(),
        JSON.stringify(subscription),
        Date.now(),
      ],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove a subscription (e.g. when the user turns notifications off).
export async function DELETE(req: NextRequest) {
  try {
    const endpoint = req.nextUrl.searchParams.get("endpoint");
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [endpoint] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
