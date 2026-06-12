import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

interface Message {
  id: string;
  user: string;
  text: string;
  timezone: "bali" | "austria";
  timestamp: number;
  meetingProposal?: {
    time: string; // ISO string
    fromTimezone: string;
    baliTime: string;
    austriaTime: string;
    dateLabel: string;
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function readMessages(): Promise<Message[]> {
  try {
    const data = await fs.readFile(MESSAGES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeMessages(messages: Message[]) {
  await ensureDataDir();
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

export async function GET() {
  const messages = await readMessages();
  // Return only last 200 messages
  return NextResponse.json({ messages: messages.slice(-200) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, text, timezone, meetingProposal } = body;

    if (!user || !text) {
      return NextResponse.json(
        { error: "user and text are required" },
        { status: 400 }
      );
    }

    const message: Message = {
      id: generateId(),
      user,
      text,
      timezone: timezone || "austria",
      timestamp: Date.now(),
    };

    if (meetingProposal) {
      message.meetingProposal = meetingProposal;
    }

    const messages = await readMessages();
    messages.push(message);
    await writeMessages(messages);

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}