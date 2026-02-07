import { NextRequest, NextResponse } from "next/server";
import { db, families, devices } from "@/lib/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST /api/family - Create a new family OR join existing with pair code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { familyName, deviceName, role } = body;
      if (!familyName || !deviceName || !role) {
        return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
      }

      const pairCode = nanoid(6).toUpperCase();

      const [family] = await db
        .insert(families)
        .values({ name: familyName, pairCode })
        .returning();

      const [device] = await db
        .insert(devices)
        .values({ familyId: family.id, name: deviceName, role })
        .returning();

      return NextResponse.json({ family, device, pairCode });
    }

    if (action === "join") {
      const { pairCode, deviceName, role } = body;
      if (!pairCode || !deviceName || !role) {
        return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
      }

      const [family] = await db
        .select()
        .from(families)
        .where(eq(families.pairCode, pairCode.toUpperCase()));

      if (!family) {
        return NextResponse.json(
          { error: "Familie nicht gefunden" },
          { status: 404 }
        );
      }

      const [device] = await db
        .insert(devices)
        .values({ familyId: family.id, name: deviceName, role })
        .returning();

      return NextResponse.json({ family, device });
    }

    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  } catch (error) {
    console.error("Family API error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// GET /api/family?id=<familyId> - Get family details with devices
export async function GET(req: NextRequest) {
  try {
    const familyId = req.nextUrl.searchParams.get("id");
    if (!familyId) {
      return NextResponse.json(
        { error: "Family ID erforderlich" },
        { status: 400 }
      );
    }

    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.id, familyId));

    if (!family) {
      return NextResponse.json(
        { error: "Familie nicht gefunden" },
        { status: 404 }
      );
    }

    const familyDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.familyId, familyId));

    return NextResponse.json({ family, devices: familyDevices });
  } catch (error) {
    console.error("Family GET error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
