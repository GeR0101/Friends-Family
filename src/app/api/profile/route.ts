import { NextRequest, NextResponse } from "next/server";
import { setAvatar } from "@/lib/accounts";

// ~700 KB cap on the data URL — avatars are downscaled client-side to a small
// square, so this is generous while keeping rows sane.
const MAX_AVATAR_CHARS = 700_000;

export async function POST(req: NextRequest) {
  try {
    const { name, avatar } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (avatar != null) {
      if (typeof avatar !== "string" || !avatar.startsWith("data:image/")) {
        return NextResponse.json({ error: "avatar must be an image data URL" }, { status: 400 });
      }
      if (avatar.length > MAX_AVATAR_CHARS) {
        return NextResponse.json({ error: "Bild ist zu groß" }, { status: 413 });
      }
    }

    const result = await setAvatar(name, avatar ?? null);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ user: result.account });
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
