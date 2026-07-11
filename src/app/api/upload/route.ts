import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// Client-upload handshake for @vercel/blob: the browser uploads the video file
// directly to Blob storage (bypassing the 4.5 MB serverless body limit); this
// route only signs the upload. Needs BLOB_READ_WRITE_TOKEN (set automatically
// once a Blob store is connected to the Vercel project).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime"],
        maximumSizeInBytes: 60 * 1024 * 1024, // ~60 MB cap for short clips
        addRandomSuffix: true,
      }),
      // Nothing to persist here — the message itself stores the returned URL.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
