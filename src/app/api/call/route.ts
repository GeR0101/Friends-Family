import { NextRequest, NextResponse } from "next/server";
import { db, calls, devices } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { sendPushToMultiple } from "@/lib/firebase/admin";

// POST /api/call - Create a new call request (kid presses the button)
export async function POST(req: NextRequest) {
  try {
    const { familyId, kidDeviceId } = await req.json();

    if (!familyId || !kidDeviceId) {
      return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
    }

    // Get kid device info
    const [kidDevice] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, kidDeviceId));

    if (!kidDevice) {
      return NextResponse.json(
        { error: "Gerät nicht gefunden" },
        { status: 404 }
      );
    }

    // Create a Daily room for this call
    const roomName = `family-call-${Date.now()}`;
    let roomUrl = "";

    const dailyKey = process.env.DAILY_API_KEY;
    if (dailyKey) {
      const res = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dailyKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "public",
          properties: {
            enable_prejoin_ui: false,
            enable_chat: false,
            enable_screenshare: false,
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          },
        }),
      });
      const data = await res.json();
      roomUrl = data.url || "";
    }

    // Insert call record
    const [call] = await db
      .insert(calls)
      .values({
        familyId,
        kidDeviceId,
        roomName,
        roomUrl,
        status: "REQUESTED",
      })
      .returning();

    // Find all parent devices in this family with push tokens
    const parentDevices = await db
      .select()
      .from(devices)
      .where(and(eq(devices.familyId, familyId), eq(devices.role, "parent")));

    const tokens = parentDevices
      .map((d) => d.pushToken)
      .filter((t): t is string => !!t);

    if (tokens.length > 0) {
      try {
        await sendPushToMultiple(tokens, {
          title: "Anruf von " + kidDevice.name,
          body: kidDevice.name + " möchte dich anrufen!",
          callId: call.id,
          roomUrl,
          kidName: kidDevice.name,
        });

        await db
          .update(calls)
          .set({ status: "NOTIFIED" })
          .where(eq(calls.id, call.id));
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }
    }

    return NextResponse.json({ call, roomUrl });
  } catch (error) {
    console.error("Call API error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// PATCH /api/call - Update call status
export async function PATCH(req: NextRequest) {
  try {
    const { callId, status } = await req.json();

    if (!callId || !status) {
      return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "ACCEPTED") updateData.acceptedAt = new Date();
    if (status === "ENDED" || status === "DECLINED")
      updateData.endedAt = new Date();

    const [call] = await db
      .update(calls)
      .set(updateData)
      .where(eq(calls.id, callId))
      .returning();

    return NextResponse.json({ call });
  } catch (error) {
    console.error("Call PATCH error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// GET /api/call?familyId=<id> - Get active calls for a family
export async function GET(req: NextRequest) {
  try {
    const familyId = req.nextUrl.searchParams.get("familyId");
    if (!familyId) {
      return NextResponse.json(
        { error: "Family ID erforderlich" },
        { status: 400 }
      );
    }

    const activeCalls = await db
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.familyId, familyId),
          eq(calls.status, "REQUESTED")
        )
      );

    // Also get NOTIFIED calls
    const notifiedCalls = await db
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.familyId, familyId),
          eq(calls.status, "NOTIFIED")
        )
      );

    return NextResponse.json({
      calls: [...activeCalls, ...notifiedCalls],
    });
  } catch (error) {
    console.error("Call GET error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
