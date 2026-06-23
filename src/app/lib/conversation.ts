export const GROUP_ID = "group";
export const GROUP_NAME = "Familie & Freunde";

/** Stable conversation id for a 1:1 chat between two users (order-independent). */
export function dmId(a: string, b: string): string {
  return "dm:" + [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("~");
}

export type Selection =
  | { type: "group" }
  | { type: "dm"; name: string };

export function selectionId(sel: Selection, me: string): string {
  return sel.type === "group" ? GROUP_ID : dmId(me, sel.name);
}
