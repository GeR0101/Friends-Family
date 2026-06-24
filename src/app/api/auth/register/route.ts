import { NextRequest, NextResponse } from "next/server";
import { createAccount } from "@/lib/accounts";
import { findCity, cityToLocation, resolveLocation } from "@/app/lib/cities";

export async function POST(req: NextRequest) {
  try {
    const { name, password, cityId, timezone, securityQuestion, securityAnswer } =
      await req.json();
    if (!name || !password) {
      return NextResponse.json(
        { error: "Name und Passwort sind erforderlich" },
        { status: 400 }
      );
    }
    // Prefer an explicit city; fall back to the legacy timezone field.
    const city = cityId ? findCity(cityId) : undefined;
    const location = city ? cityToLocation(city) : resolveLocation(timezone);
    if (!location) {
      return NextResponse.json({ error: "Bitte wähle deinen Ort aus" }, { status: 400 });
    }
    const result = await createAccount(
      name,
      password,
      location,
      securityQuestion,
      securityAnswer
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ user: result.account });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
