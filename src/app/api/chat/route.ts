import { NextRequest, NextResponse } from "next/server";
import type { Row } from "@libsql/client";
import { getDb } from "@/app/lib/db";

interface MeetingProposal {
  startsAt?: number; // absolute epoch (ms) — viewer renders in their own zone
  proposedByTz?: string; // IANA of the proposer, for reference
  invitees?: string[];
  status?: "pending" | "accepted";
  acceptedBy?: string;
  roomName?: string;
  // Legacy fields (pre-absolute-time model) kept for old records.
  time?: string;
  fromTimezone?: string;
}

interface RoomInvite {
  name: string;
  url?: string;
}

interface Message {
  id: string;
  user: string;
  text: string;
  timezone: string;
  timestamp: number;
  conversationId?: string;
  meetingProposal?: MeetingProposal;
  roomInvite?: RoomInvite;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseJson<T>(value: unknown): T | undefined {
  if (value == null) return undefined;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return undefined;
  }
}

function rowToMessage(r: Row): Message {
  return {
    id: String(r.id),
    user: String(r.user),
    text: String(r.text),
    timezone: r.timezone == null ? "austria" : String(r.timezone),
    timestamp: Number(r.timestamp),
    conversationId: r.conversation_id == null ? "group" : String(r.conversation_id),
    meetingProposal: parseJson<MeetingProposal>(r.meeting_proposal),
    roomInvite: parseJson<RoomInvite>(r.room_invite),
  };
}

const SELECT =
  "SELECT id, user, text, timezone, timestamp, conversation_id, meeting_proposal, room_invite FROM messages";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const conversationId = req.nextUrl.searchParams.get("conversationId");

  if (conversationId) {
    // Legacy messages without a conversationId belong to the group chat.
    const rs =
      conversationId === "group"
        ? await db.execute(
            `${SELECT} WHERE conversation_id = 'group' OR conversation_id IS NULL ORDER BY timestamp ASC LIMIT 200`
          )
        : await db.execute({
            sql: `${SELECT} WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT 200`,
            args: [conversationId],
          });
    return NextResponse.json({ messages: rs.rows.map(rowToMessage) });
  }

  const rs = await db.execute(`${SELECT} ORDER BY timestamp ASC LIMIT 200`);
  return NextResponse.json({ messages: rs.rows.map(rowToMessage) });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, by } = body;

    if (!id || action !== "accept") {
      return NextResponse.json(
        { error: "id and action='accept' are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const rs = await db.execute({ sql: `${SELECT} WHERE id = ?`, args: [id] });
    const msg = rs.rows[0] ? rowToMessage(rs.rows[0]) : null;

    if (!msg || !msg.meetingProposal) {
      return NextResponse.json({ error: "Meeting proposal not found" }, { status: 404 });
    }

    // Already accepted → return as-is (idempotent, both parties can hit this).
    if (msg.meetingProposal.status !== "accepted") {
      msg.meetingProposal.status = "accepted";
      msg.meetingProposal.acceptedBy = by || "jemand";
      msg.meetingProposal.roomName = `treffen-${msg.id}`;
      await db.execute({
        sql: "UPDATE messages SET meeting_proposal = ? WHERE id = ?",
        args: [JSON.stringify(msg.meetingProposal), msg.id],
      });
    }

    return NextResponse.json({ message: msg });
  } catch (error) {
    console.error("Chat PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, text, timezone, meetingProposal, roomInvite, conversationId } = body;

    if (!user || !text) {
      return NextResponse.json({ error: "user and text are required" }, { status: 400 });
    }

    const message: Message = {
      id: generateId(),
      user,
      text,
      timezone: timezone || "austria",
      timestamp: Date.now(),
      conversationId: conversationId || "group",
    };

    if (meetingProposal) {
      message.meetingProposal = { ...meetingProposal, status: "pending" };
    }
    if (roomInvite && roomInvite.name) {
      message.roomInvite = { name: roomInvite.name, url: roomInvite.url };
    }

    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO messages (id, user, text, timezone, timestamp, conversation_id, meeting_proposal, room_invite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        message.id,
        message.user,
        message.text,
        message.timezone,
        message.timestamp,
        message.conversationId!,
        message.meetingProposal ? JSON.stringify(message.meetingProposal) : null,
        message.roomInvite ? JSON.stringify(message.roomInvite) : null,
      ],
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
