import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

interface OnlineUser {
  name: string;
  timezone: "bali" | "austria";
  online: boolean;
  lastSeen: number;
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function readUsers(): Promise<OnlineUser[]> {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeUsers(users: OnlineUser[]) {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

function cleanupStaleUsers(users: OnlineUser[]): OnlineUser[] {
  const fiveMinutes = 5 * 60 * 1000;
  const now = Date.now();
  return users.filter(
    (u) => u.online && now - u.lastSeen < fiveMinutes
  );
}

export async function GET() {
  let users = await readUsers();
  users = cleanupStaleUsers(users);
  await writeUsers(users);
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, timezone, online } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    let users = await readUsers();
    users = cleanupStaleUsers(users);

    if (online) {
      // Update or add user
      const existing = users.find((u) => u.name === name);
      if (existing) {
        existing.online = true;
        existing.lastSeen = Date.now();
        existing.timezone = timezone || existing.timezone;
      } else {
        users.push({
          name,
          timezone: timezone || "austria",
          online: true,
          lastSeen: Date.now(),
        });
      }
    } else {
      // Remove user
      users = users.filter((u) => u.name !== name);
    }

    await writeUsers(users);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Users API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}