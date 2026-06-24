export const GROUP_ID = "group";
export const GROUP_NAME = "Familie & Freunde";

/** Stable conversation id for a 1:1 chat between two users (order-independent). */
export function dmId(a: string, b: string): string {
  return "dm:" + [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("~");
}

/**
 * Stable conversation id for an ad-hoc group (order-independent, deduped).
 * Everyone in the same set of people shares this one thread → reply-all.
 */
export function grpId(names: string[]): string {
  const uniq = Array.from(new Set(names.map((n) => n.trim().toLowerCase()))).sort();
  return "grp:" + uniq.join("~");
}

/** The lowercased member slugs encoded in a group conversation id. */
export function membersOfGrp(id: string): string[] {
  return id.startsWith("grp:") ? id.slice(4).split("~").filter(Boolean) : [];
}

export type Selection =
  | { type: "dm"; name: string }
  | { type: "group"; id: string; members: string[] };

export function selectionId(sel: Selection, me: string): string {
  return sel.type === "group" ? sel.id : dmId(me, sel.name);
}
