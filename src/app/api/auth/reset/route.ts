import { NextRequest, NextResponse } from "next/server";
import { getSecurityQuestion, resetPassword } from "@/lib/accounts";

// Step 1: fetch the security question for a name.
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const question = await getSecurityQuestion(name);
  return NextResponse.json({ question });
}

// Step 2: verify the answer and set a new password.
export async function POST(req: NextRequest) {
  try {
    const { name, answer, newPassword } = await req.json();
    if (!name || !answer || !newPassword) {
      return NextResponse.json(
        { error: "name, answer und newPassword sind erforderlich" },
        { status: 400 }
      );
    }
    const result = await resetPassword(name, answer, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
