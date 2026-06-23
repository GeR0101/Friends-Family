import { NextRequest, NextResponse } from "next/server";
import type { Row } from "@libsql/client";
import { zonedToEpoch } from "@/app/lib/timezone";
import { resolveLocation } from "@/app/lib/cities";
import { getDb } from "@/app/lib/db";

interface MeetingProposal {
  startsAt?: number; // absolute epoch (ms) — new format
  proposedByTz?: string; // IANA, for reference
  // Legacy fields (pre-location refactor):
  time?: string;
  fromTimezone?: string;
  invitees?: string[];
  status?: "pending" | "accepted";
  acceptedBy?: string;
  roomName?: string;
}

interface Message {
  id: string;
  user: string;
  conversationId?: string;
  meetingProposal?: MeetingProposal;
}

// All messages that carry a proposal — filtering/grouping happens in JS so the
// (legacy-aware) eligibility rules stay in one place.
async function readProposals(): Promise<Message[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT id, user, conversation_id, meeting_proposal FROM messages WHERE meeting_proposal IS NOT NULL"
  );
  return rs.rows
    .map((r: Row): Message | null => {
      let proposal: MeetingProposal | undefined;
      try {
        proposal = JSON.parse(String(r.meeting_proposal)) as MeetingProposal;
      } catch {
        return null;
      }
      return {
        id: String(r.id),
        user: String(r.user),
        conversationId: r.conversation_id == null ? "group" : String(r.conversation_id),
        meetingProposal: proposal,
      };
    })
    .filter((m): m is Message => m !== null);
}

const lc = (s: string) => s.trim().toLowerCase();

// Resolve a proposal's absolute start instant, supporting legacy records.
function startEpoch(p: MeetingProposal): number {
  if (typeof p.startsAt === "number") return p.startsAt;
  if (p.time) {
    const loc = resolveLocation(p.fromTimezone);
    if (loc) return zonedToEpoch(p.time, loc.tz);
  }
  return NaN;
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");

  // Single-meeting lookup by room name (room page "you're early" countdown).
  if (room) {
    const messages = await readProposals();
    const hit = messages.find(
      (m) => m.meetingProposal?.status === "accepted" && m.meetingProposal.roomName === room
    );
    if (!hit) return NextResponse.json({ meeting: null });
    const p = hit.meetingProposal!;
    return NextResponse.json({
      meeting: { id: hit.id, roomName: room, startsAt: startEpoch(p) },
    });
  }

  const me = req.nextUrl.searchParams.get("user");
  if (!me) {
    return NextResponse.json({ error: "user is required" }, { status: 400 });
  }
  const meLc = lc(me);
  const messages = await readProposals();
  const now = Date.now();
  const KEEP_AFTER = 60 * 60 * 1000; // keep showing for 1h after start

  const seen = new Set<string>();
  const meetings = messages
    .filter((m) => m.meetingProposal?.status === "accepted" && m.meetingProposal.roomName)
    .filter((m) => {
      const p = m.meetingProposal!;
      const conv = m.conversationId || "group";
      if (conv.startsWith("dm:")) {
        return conv.slice(3).split("~").includes(meLc);
      }
      const invitees = p.invitees;
      if (!invitees || invitees.length === 0) return true; // group-wide
      return invitees.some((n) => lc(n) === meLc) || lc(m.user) === meLc;
    })
    .map((m) => {
      const p = m.meetingProposal!;
      return {
        id: m.id,
        roomName: p.roomName!,
        startsAt: startEpoch(p),
        proposer: m.user,
        acceptedBy: p.acceptedBy,
        invitees: p.invitees || [],
      };
    })
    .filter((mt) => !Number.isNaN(mt.startsAt) && mt.startsAt > now - KEEP_AFTER)
    .filter((mt) => (seen.has(mt.roomName) ? false : (seen.add(mt.roomName), true)))
    .sort((a, b) => a.startsAt - b.startsAt);

  return NextResponse.json({ meetings });
}
