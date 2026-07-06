import type { Client } from "@libsql/client";

export interface UnreadSummary {
  // Unread count keyed by the OTHER participant's lowercased name.
  byOther: Record<string, number>;
  // Grand total across all conversations — used for the app-icon badge.
  total: number;
}

/**
 * How many unread direct messages the user has, per contact. A message is
 * "unread" when it was sent by someone else after the user's last-read marker
 * for that conversation.
 */
export async function unreadForUser(db: Client, name: string): Promise<UnreadSummary> {
  const lower = name.trim().toLowerCase();
  const [msgs, reads] = await Promise.all([
    db.execute(
      "SELECT conversation_id, user, timestamp FROM messages WHERE conversation_id LIKE 'dm:%'"
    ),
    db.execute({
      sql: "SELECT conversation_id, last_read_ts FROM reads WHERE user_lower = ?",
      args: [lower],
    }),
  ]);

  const readMap = new Map<string, number>();
  for (const r of reads.rows) readMap.set(String(r.conversation_id), Number(r.last_read_ts));

  const byOther: Record<string, number> = {};
  let total = 0;
  for (const row of msgs.rows) {
    const conv = String(row.conversation_id);
    const parts = conv.slice(3).split("~"); // strip "dm:"
    if (!parts.includes(lower)) continue; // not my conversation
    const sender = String(row.user).toLowerCase();
    if (sender === lower) continue; // my own message never counts
    if (Number(row.timestamp) <= (readMap.get(conv) || 0)) continue; // already read
    const other = parts.find((p) => p !== lower) || sender;
    byOther[other] = (byOther[other] || 0) + 1;
    total++;
  }
  return { byOther, total };
}

/** Mark a conversation read for the user up to (and including) `ts`. */
export async function markRead(
  db: Client,
  name: string,
  conversationId: string,
  ts: number
): Promise<void> {
  const lower = name.trim().toLowerCase();
  await db.execute({
    sql: `INSERT INTO reads (user_lower, conversation_id, last_read_ts)
          VALUES (?, ?, ?)
          ON CONFLICT(user_lower, conversation_id)
          DO UPDATE SET last_read_ts = MAX(last_read_ts, excluded.last_read_ts)`,
    args: [lower, conversationId, ts],
  });
}
