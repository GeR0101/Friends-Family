import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "DAILY_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const rawName = body.name || generateRoomName();
    // Sanitize room name: lowercase, replace spaces/special chars with dashes, remove invalid chars
    const roomName = rawName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[äöüß]/g, (c: string) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c] || c))
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || generateRoomName();

    // First check if room already exists
    const checkRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (checkRes.ok) {
      const existingRoom = await checkRes.json();
      return NextResponse.json({
        url: existingRoom.url,
        name: existingRoom.name,
        created: false,
      });
    }

    // Room doesn't exist, create it
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: {
          enable_prejoin_ui: true,
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Daily API error:", data);
      return NextResponse.json(
        { error: data.error || "Failed to create room" },
        { status: res.status }
      );
    }

    return NextResponse.json({
      url: data.url,
      name: data.name,
      created: true,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateRoomName(): string {
  const adjectives = ["happy", "quick", "bright", "calm", "bold", "cool"];
  const nouns = ["meeting", "sync", "call", "chat", "huddle", "standup"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}
