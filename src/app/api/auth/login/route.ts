import { NextRequest, NextResponse } from "next/server";
import { verifyLogin } from "@/lib/accounts";

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();
    if (!name || !password) {
      return NextResponse.json(
        { error: "Name und Passwort sind erforderlich" },
        { status: 400 }
      );
    }
    const result = await verifyLogin(name, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ user: result.account });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
