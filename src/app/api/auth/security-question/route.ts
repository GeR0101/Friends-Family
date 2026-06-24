import { NextRequest, NextResponse } from "next/server";
import { setSecurityQuestion } from "@/lib/accounts";

// Set/replace a security question for an existing account (needs the password).
export async function POST(req: NextRequest) {
  try {
    const { name, password, question, answer } = await req.json();
    if (!name || !password || !question || !answer) {
      return NextResponse.json(
        { error: "name, password, question und answer sind erforderlich" },
        { status: 400 }
      );
    }
    const result = await setSecurityQuestion(name, password, question, answer);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ user: result.account });
  } catch (error) {
    console.error("Security-question error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
