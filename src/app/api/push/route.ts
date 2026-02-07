import { NextRequest, NextResponse } from "next/server";
import { db, devices } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/push - Register or update push token for a device
export async function POST(req: NextRequest) {
  try {
    const { deviceId, pushToken } = await req.json();

    if (!deviceId || !pushToken) {
      return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
    }

    const [device] = await db
      .update(devices)
      .set({ pushToken, lastSeen: new Date() })
      .where(eq(devices.id, deviceId))
      .returning();

    if (!device) {
      return NextResponse.json(
        { error: "Gerät nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, device });
  } catch (error) {
    console.error("Push API error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
