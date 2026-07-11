import { NextRequest, NextResponse } from "next/server";
import type { Row } from "@libsql/client";
import { getDb } from "@/app/lib/db";
import { sendPushToUser } from "@/app/lib/push";
import { unreadForUser } from "@/app/lib/reads";

interface MeetingProposal {
  startsAt?: number; // absolute epoch (ms) — viewer renders in their own zone
  proposedByTz?: string; // IANA of the proposer, for reference
  invitees?: string[];
  status?: "pending" | "accepted" | "declined";
  acceptedBy?: string;
  declinedBy?: string;
  roomKey?: string; // shared room id so all copies of one invite join the same room
  roomName?: string;
  // Legacy fields (pre-absolute-time model) kept for old records.
  time?: string;
  fromTimezone?: string;
}

interface RoomInvite {
  name: string;
  url?: string;
}

interface Attachment {
  type: "video";
  url: string;
  poster?: string; // still frame shown before playback
  durationMs?: number;
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
  // Everyone this message was sent to at once (sender + recipients). Lets a DM
  // show "also sent to …" and offer reply-all, without a separate group thread.
  broadcast?: string[];
  attachment?: Attachment; // e.g. a recorded video message
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
    broadcast: parseJson<string[]>(r.broadcast),
    attachment: parseJson<Attachment>(r.attachment),
  };
}

const SELECT =
  "SELECT id, user, text, timezone, timestamp, conversation_id, meeting_proposal, room_invite, broadcast, attachment FROM messages";

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

    if (!id || (action !== "accept" && action !== "decline")) {
      return NextResponse.json(
        { error: "id and action='accept'|'decline' are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const rs = await db.execute({ sql: `${SELECT} WHERE id = ?`, args: [id] });
    const msg = rs.rows[0] ? rowToMessage(rs.rows[0]) : null;

    if (!msg || !msg.meetingProposal) {
      return NextResponse.json({ error: "Meeting proposal not found" }, { status: 404 });
    }

    if (action === "accept" && msg.meetingProposal.status !== "accepted") {
      // Accepting (re-)opens the room, even if it was previously declined.
      msg.meetingProposal.status = "accepted";
      msg.meetingProposal.acceptedBy = by || "jemand";
      msg.meetingProposal.declinedBy = undefined;
      // Use the shared room key so every invitee joins the SAME room.
      msg.meetingProposal.roomName =
        msg.meetingProposal.roomKey || `treffen-${msg.id}`;
      await db.execute({
        sql: "UPDATE messages SET meeting_proposal = ? WHERE id = ?",
        args: [JSON.stringify(msg.meetingProposal), msg.id],
      });
    } else if (action === "decline" && msg.meetingProposal.status !== "declined") {
      msg.meetingProposal.status = "declined";
      msg.meetingProposal.declinedBy = by || "jemand";
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

// Delete a message (e.g. cancel a planned meeting).
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM messages WHERE id = ?", args: [id] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Chat DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, text, timezone, meetingProposal, roomInvite, conversationId, broadcast, attachment } = body;

    const validAttachment =
      attachment && attachment.type === "video" && typeof attachment.url === "string"
        ? {
            type: "video" as const,
            url: attachment.url,
            poster: typeof attachment.poster === "string" ? attachment.poster : undefined,
            durationMs: typeof attachment.durationMs === "number" ? attachment.durationMs : undefined,
          }
        : undefined;

    // A message needs text OR an attachment (a video message has no text).
    if (!user || (!text && !validAttachment)) {
      return NextResponse.json({ error: "user and text or attachment are required" }, { status: 400 });
    }

    const message: Message = {
      id: generateId(),
      user,
      text: text || "",
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
    if (Array.isArray(broadcast) && broadcast.length > 1) {
      message.broadcast = broadcast;
    }
    if (validAttachment) {
      message.attachment = validAttachment;
    }

    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO messages (id, user, text, timezone, timestamp, conversation_id, meeting_proposal, room_invite, broadcast, attachment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        message.id,
        message.user,
        message.text,
        message.timezone,
        message.timestamp,
        message.conversationId!,
        message.meetingProposal ? JSON.stringify(message.meetingProposal) : null,
        message.roomInvite ? JSON.stringify(message.roomInvite) : null,
        message.broadcast ? JSON.stringify(message.broadcast) : null,
        message.attachment ? JSON.stringify(message.attachment) : null,
      ],
    });

    // Best-effort lock-screen notifications to the other people involved.
    try {
      const senderLower = message.user.toLowerCase();
      const conv = message.conversationId!;
      let recipients: string[];
      if (conv.startsWith("dm:")) {
        // "dm:a~b" → the participants, minus the sender.
        recipients = conv
          .slice(3)
          .split("~")
          .filter((n) => n && n !== senderLower);
      } else if (conv.startsWith("grp:")) {
        // "grp:a~b~c" → all group members, minus the sender.
        recipients = conv
          .slice(4)
          .split("~")
          .filter((n) => n && n !== senderLower);
      } else {
        // Group: everyone who has a subscription, except the sender.
        const rs = await db.execute({
          sql: "SELECT DISTINCT user_lower FROM push_subscriptions WHERE user_lower != ?",
          args: [senderLower],
        });
        recipients = rs.rows.map((r) => String(r.user_lower));
      }
      const body = message.meetingProposal
        ? "📅 schlägt ein Treffen vor"
        : message.roomInvite
        ? "📹 lädt dich in einen Video-Raum ein"
        : message.attachment
        ? "🎥 Videobotschaft"
        : message.text;
      await Promise.all(
        recipients.map(async (r) => {
          // Include the recipient's fresh total so the app icon shows the right
          // count even while the app is closed (the SW reads this on push).
          let badge: number | undefined;
          try {
            badge = (await unreadForUser(db, r)).total;
          } catch {}
          return sendPushToUser(r, {
            title: message.user,
            body,
            url: "/dashboard",
            tag: conv,
            badge,
          });
        })
      );
    } catch {
      // Notifications must never block sending a message.
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
