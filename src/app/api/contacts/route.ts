import { NextRequest, NextResponse } from "next/server";
import { readAccounts, toPublic } from "@/lib/accounts";
import {
  requestContact,
  respondContact,
  removeContact,
  contactLowersOf,
  incomingLowersOf,
  outgoingLowersOf,
} from "@/lib/contacts";
import { getDb } from "@/app/lib/db";

const FIVE_MINUTES = 5 * 60 * 1000;

// GET ?user=X → the user's accepted contacts (with presence), plus pending
// incoming requests (to act on) and outgoing requests (already sent).
export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");
  if (!user) return NextResponse.json({ error: "user is required" }, { status: 400 });

  try {
    const accounts = await readAccounts();
    const byLower = new Map(accounts.map((a) => [a.name.toLowerCase(), toPublic(a)]));

    const db = await getDb();
    const cutoff = Date.now() - FIVE_MINUTES;
    const rs = await db.execute({
      sql: "SELECT name_lower, last_seen FROM presence WHERE online = 1 AND last_seen >= ?",
      args: [cutoff],
    });
    const presence = new Map<string, number>(
      rs.rows.map((r) => [String(r.name_lower), Number(r.last_seen)])
    );

    const [contactLowers, incomingLowers, outgoingLowers] = await Promise.all([
      contactLowersOf(user),
      incomingLowersOf(user),
      outgoingLowersOf(user),
    ]);

    const contacts = contactLowers
      .map((low) => byLower.get(low))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({
        ...a,
        online: presence.has(a.name.toLowerCase()),
        lastSeen: presence.get(a.name.toLowerCase()) ?? 0,
      }));

    const incoming = incomingLowers
      .map((low) => byLower.get(low))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({ name: a.name, location: a.location, avatar: a.avatar }));

    const outgoing = outgoingLowers
      .map((low) => byLower.get(low)?.name)
      .filter((n): n is string => !!n);

    return NextResponse.json({ contacts, incoming, outgoing });
  } catch (error) {
    console.error("Contacts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST { user, target } → send (or auto-accept) a contact request.
export async function POST(req: NextRequest) {
  try {
    const { user, target } = await req.json();
    if (!user || !target) {
      return NextResponse.json({ error: "user and target are required" }, { status: 400 });
    }
    const result = await requestContact(user, target);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Contacts POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH { user, requester, action: "accept" | "decline" }
export async function PATCH(req: NextRequest) {
  try {
    const { user, requester, action } = await req.json();
    if (!user || !requester || (action !== "accept" && action !== "decline")) {
      return NextResponse.json(
        { error: "user, requester and action='accept'|'decline' are required" },
        { status: 400 }
      );
    }
    await respondContact(user, requester, action === "accept");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contacts PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE ?user=X&other=Y → remove a connection.
export async function DELETE(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");
  const other = req.nextUrl.searchParams.get("other");
  if (!user || !other) {
    return NextResponse.json({ error: "user and other are required" }, { status: 400 });
  }
  try {
    await removeContact(user, other);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contacts DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
