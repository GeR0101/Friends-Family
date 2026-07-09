// Chat wallpapers the user can pick from (Bali doodle patterns). Extracted from
// the source grid in public/. The preference is stored per device.

export interface ChatBackground {
  id: string;
  name: string;
  src: string;
  swatch: string; // average color — shown while the image loads
}

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  { id: "tempel", name: "Tempel", src: "/backgrounds/tempel.webp", swatch: "#efe2d3" },
  { id: "buddha", name: "Buddha", src: "/backgrounds/buddha.webp", swatch: "#d5d0b7" },
  { id: "sonnenuntergang", name: "Sonnenuntergang", src: "/backgrounds/sonnenuntergang.webp", swatch: "#ecc8ac" },
  { id: "unterwasser", name: "Unterwasser", src: "/backgrounds/unterwasser.webp", swatch: "#c9dad4" },
  { id: "insel", name: "Insel", src: "/backgrounds/insel.webp", swatch: "#ebe1d0" },
  { id: "barong", name: "Barong", src: "/backgrounds/barong.webp", swatch: "#d2c4b1" },
];

const KEY = "ff_chat_bg";
export const BG_EVENT = "ff-bg-change";

export function getChatBgId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setChatBgId(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
    // Let other components (the chat pane) update live.
    window.dispatchEvent(new CustomEvent(BG_EVENT, { detail: id }));
  } catch {}
}

export function bgById(id: string | null): ChatBackground | undefined {
  return id ? CHAT_BACKGROUNDS.find((b) => b.id === id) : undefined;
}
