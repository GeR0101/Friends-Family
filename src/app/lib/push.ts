import webpush from "web-push";
import { getDb } from "./db";

// Web Push needs a VAPID key pair. The public key is also exposed to the client
// via NEXT_PUBLIC_VAPID_PUBLIC_KEY; the private key stays server-side only.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@tropics.at";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // where to go when the notification is tapped
  tag?: string; // collapses notifications with the same tag
}

/**
 * Send a notification to every device a user has registered. Dead subscriptions
 * (HTTP 404/410) are pruned. Best-effort: never throws to the caller.
 */
export async function sendPushToUser(userLower: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  let sent = 0;
  try {
    const db = await getDb();
    const rs = await db.execute({
      sql: "SELECT endpoint, subscription FROM push_subscriptions WHERE user_lower = ?",
      args: [userLower],
    });
    if (rs.rows.length === 0) return 0;

    const body = JSON.stringify(payload);
    await Promise.all(
      rs.rows.map(async (row) => {
        const endpoint = String(row.endpoint);
        try {
          const sub = JSON.parse(String(row.subscription));
          await webpush.sendNotification(sub, body);
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await db.execute({
              sql: "DELETE FROM push_subscriptions WHERE endpoint = ?",
              args: [endpoint],
            });
          }
        }
      })
    );
  } catch {
    // Notifications are non-critical — swallow any storage/transport errors.
  }
  return sent;
}
