"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  convertTimeString,
  findTimeInText,
  getTimeInTimezone,
  getTimeOfDay,
  timeAtEpoch,
  hourAtEpoch,
  isAwakeHour,
  zonedToEpoch,
} from "../lib/timezone";
import {
  type Location,
  normalizeStoredUser,
  resolveLocation,
} from "../lib/cities";
import { dmId, type Selection } from "../lib/conversation";

interface User {
  name: string;
  location: Location;
  avatar?: string;
}

interface Contact {
  name: string;
  location: Location;
  avatar?: string;
  online: boolean;
  lastSeen: number;
}

interface MeetingProposal {
  startsAt?: number; // absolute epoch (ms) — missing on legacy proposals
  proposedByTz?: string;
  invitees?: string[];
  status?: "pending" | "accepted" | "declined";
  acceptedBy?: string;
  declinedBy?: string;
  roomKey?: string;
  roomName?: string;
  // Legacy fields (pre-absolute-time model) used as a fallback.
  time?: string;
  fromTimezone?: string;
}

// Resolve a proposal's start time to an absolute epoch. New proposals carry
// `startsAt`; legacy ones are reconstructed from `time` + `fromTimezone`.
function proposalEpoch(p: MeetingProposal): number {
  if (typeof p.startsAt === "number" && Number.isFinite(p.startsAt)) {
    return p.startsAt;
  }
  if (p.time) {
    const tz = resolveLocation(p.fromTimezone)?.tz ?? "Europe/Vienna";
    const epoch = zonedToEpoch(p.time, tz);
    if (Number.isFinite(epoch)) return epoch;
  }
  return NaN;
}

interface RoomInvite {
  name: string;
  url?: string;
}

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  meetingProposal?: MeetingProposal;
  roomInvite?: RoomInvite;
  broadcast?: string[];
}

// Deterministic on-brand avatar gradient per person name.
function avatarGradient(name: string) {
  const gradients = [
    "from-amber-400 to-orange-500",
    "from-violet-400 to-purple-500",
    "from-pink-400 to-rose-500",
    "from-sky-400 to-blue-500",
    "from-emerald-400 to-green-500",
    "from-fuchsia-400 to-violet-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
}

// Round avatar: shows the person's photo if set, otherwise a gradient initial.
function Avatar({
  name,
  avatar,
  className = "w-12 h-12",
  textClassName = "",
}: {
  name: string;
  avatar?: string;
  className?: string;
  textClassName?: string;
}) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={name}
        className={`${className} rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-full bg-gradient-to-br ${avatarGradient(
        name
      )} flex items-center justify-center`}
    >
      <span className={`text-white font-bold ${textClassName}`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// Friendly day label ("Heute" / "Morgen" / "Mi, 18.06.") in a given zone.
function dayLabel(epoch: number, iana: string): string {
  const ymd = (ms: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: iana }).format(new Date(ms));
  if (!Number.isFinite(epoch)) return "";
  const target = ymd(epoch);
  if (target === ymd(Date.now())) return "Heute";
  if (target === ymd(Date.now() + 86400000)) return "Morgen";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: iana,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(epoch));
}

// Day/night glyph — a sun when the person is awake, a moon when they likely sleep.
function DayNight({ awake, className = "w-4 h-4" }: { awake: boolean; className?: string }) {
  return awake ? (
    <svg className={`${className} text-amber-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ) : (
    <svg className={`${className} text-slate-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

// The signature "is everyone awake?" bar — calm green when it fits, amber when not.
function AwakeBar({ ok, asleepNames }: { ok: boolean; asleepNames: string[] }) {
  return ok ? (
    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-medium">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Passt – alle sind wach
    </div>
  ) : (
    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 text-amber-700 px-3 py-2 text-sm font-medium">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
      {asleepNames.length ? `${asleepNames.join(", ")} schläft evtl.` : "Da schläft jemand"}
    </div>
  );
}

// One reusable "face · local time · place · day/night" row — used in the planner
// preview and in every meeting card, so the visual language stays identical.
function PersonTimeRow({
  name,
  avatar,
  location,
  startsAt,
}: {
  name: string;
  avatar?: string;
  location: Location;
  startsAt: number;
}) {
  const awake = isAwakeHour(hourAtEpoch(startsAt, location.tz));
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} avatar={avatar} className="w-7 h-7 flex-shrink-0" textClassName="text-[11px]" />
      <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
        {timeAtEpoch(startsAt, location.tz)} Uhr
      </span>
      <span className="text-xs text-gray-400 truncate">
        {location.flag} {location.name}
      </span>
      <DayNight awake={awake} className="w-4 h-4 ml-auto flex-shrink-0" />
    </div>
  );
}

// A small curated set for the quick emoji picker in the chat input.
const EMOJIS = [
  "😀", "😄", "😍", "🥰", "😘", "😊", "😎", "🤩",
  "😂", "🤣", "😅", "😉", "🙃", "😴", "🤔", "😇",
  "😢", "😭", "😡", "🥳", "😱", "🤗", "🤪", "😜",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👋", "🤝",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨",
  "🎉", "🎂", "🍕", "☕", "🍺", "🌴", "☀️", "🌙",
  "✈️", "🏖️", "📷", "🎵", "⚽", "🚗", "🏠", "💯",
];

export default function ChatPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [incoming, setIncoming] = useState<{ name: string; location: Location; avatar?: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [selectedTime, setSelectedTime] = useState("18:00");
  const [planMode, setPlanMode] = useState<"now" | "later">("later");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [, setTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevConvRef = useRef<string | null>(null);

  // Insert an emoji at the current caret position (append if the textarea isn't
  // focused), then restore the caret just after it.
  const insertEmoji = (emoji: string) => {
    const ta = inputRef.current;
    const start = ta?.selectionStart ?? input.length;
    const end = ta?.selectionEnd ?? input.length;
    setInput((v) => v.slice(0, start) + emoji + v.slice(end));
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };
  const prevLastIdRef = useRef<string | null>(null);
  const hadSelectionRef = useRef(false);

  // Load user
  useEffect(() => {
    const u = normalizeStoredUser(localStorage.getItem("ff_user"));
    if (!u) {
      router.push("/");
      return;
    }
    setUser(u);
  }, [router]);

  // Clock tick (updates local times in the UI every second)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Load the user's accepted contacts + pending requests.
  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/contacts?user=${encodeURIComponent(user.name)}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setIncoming(data.incoming || []);
    } catch {}
  }, [user]);

  // Poll contacts/requests. Presence (online/offline) is owned by the
  // dashboard, which is always mounted around this panel.
  useEffect(() => {
    if (!user) return;
    loadContacts();
    const id = setInterval(loadContacts, 4000);
    return () => clearInterval(id);
  }, [user, loadContacts]);

  const conversationId = user && selected
    ? selected.type === "group"
      ? selected.id
      : dmId(user.name, selected.name)
    : null;

  // Load + poll messages for the active conversation
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(conversationId)}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    loadMessages();
    const id = setInterval(loadMessages, 2000);
    return () => clearInterval(id);
  }, [conversationId, loadMessages]);

  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Scroll handling: jump straight to the newest message when a conversation
  // opens, and again when I send one myself. Incoming messages never move the
  // view — so reading older messages stays calm (no auto-scroll on polling).
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) {
      prevLastIdRef.current = null;
      return;
    }
    const convChanged = prevConvRef.current !== conversationId;
    if (convChanged) {
      prevConvRef.current = conversationId;
      prevLastIdRef.current = last.id;
      // Run a couple of times so late-loading content (avatars, cards) doesn't
      // leave us stranded mid-feed.
      requestAnimationFrame(() => scrollToBottom());
      setTimeout(() => scrollToBottom(), 120);
      setTimeout(() => scrollToBottom(), 350);
      return;
    }
    const isNew = last.id !== prevLastIdRef.current;
    if (isNew && last.user === user?.name) {
      scrollToBottom(true);
    }
    prevLastIdRef.current = last.id;
  }, [messages, conversationId, user]);

  // Grow the message box with its content (and shrink back after sending).
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  // Opening a conversation adds a history entry, so the browser back gesture
  // (incl. the iOS swipe-from-left-edge) returns to the contact list instead of
  // leaving the app. Switching between conversations doesn't stack entries.
  useEffect(() => {
    const has = !!selected;
    if (has && !hadSelectionRef.current) {
      window.history.pushState({ ffChat: true }, "");
    }
    hadSelectionRef.current = has;
  }, [selected]);

  useEffect(() => {
    const onPop = () => {
      if (hadSelectionRef.current) setSelected(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const sendMessage = async (
    text: string,
    meetingProposal?: MeetingProposal,
    roomInvite?: RoomInvite,
    conversationOverride?: string
  ) => {
    const conv = conversationOverride || conversationId;
    if (!user || !conv || (!text.trim() && !meetingProposal && !roomInvite)) return;
    setSending(true);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: user.name,
          text: meetingProposal ? `📅 ${user.name} schlägt ein Treffen vor:` : text,
          timezone: user.location.tz,
          conversationId: conv,
          meetingProposal,
          roomInvite,
        }),
      });
      setInput("");
      setShowTimePicker(false);
      await loadMessages();
    } catch {}
    setSending(false);
  };

  // ── Broadcast a message to several friends at once ──
  const [multiOpen, setMultiOpen] = useState(false);
  const [msgRecipients, setMsgRecipients] = useState<string[]>([]);
  const toggleRecipient = (name: string) =>
    setMsgRecipients((prev) =>
      prev.some((n) => n.toLowerCase() === name.toLowerCase())
        ? prev.filter((n) => n.toLowerCase() !== name.toLowerCase())
        : [...prev, name]
    );

  // Switching conversations closes the planner and the multi-recipient picker —
  // each conversation starts fresh (you may just want to write a message here,
  // not carry over a half-planned meeting from the previous person). Re-opening
  // the calendar then pre-selects the current person again.
  useEffect(() => {
    setShowTimePicker(false);
    setMultiOpen(false);
    setEmojiOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Send the same message into each recipient's direct chat (no group thread).
  // The full audience is tagged on every copy so each DM can show "auch an …"
  // and offer reply-all.
  const sendToMultiple = async (text: string) => {
    if (!user) return;
    const targets = msgRecipients.filter((n) => n.toLowerCase() !== user.name.toLowerCase());
    if (targets.length === 0) {
      sendMessage(text);
      return;
    }
    if (targets.length === 1) {
      // Just a normal direct message.
      await sendMessage(text, undefined, undefined, dmId(user.name, targets[0]));
      setMultiOpen(false);
      setMsgRecipients([]);
      setSelected({ type: "dm", name: targets[0] });
      return;
    }
    const audience = [user.name, ...targets];
    setSending(true);
    try {
      await Promise.all(
        targets.map((n) =>
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: user.name,
              text,
              timezone: user.location.tz,
              conversationId: dmId(user.name, n),
              broadcast: audience,
            }),
          })
        )
      );
      setInput("");
      setMultiOpen(false);
      setMsgRecipients([]);
      setSelected({ type: "dm", name: targets[0] });
    } catch {}
    setSending(false);
  };

  // "Allen antworten" — reply to everyone a broadcast went to.
  const replyAll = (audience: string[]) => {
    if (!user) return;
    setMsgRecipients(audience.filter((n) => n.toLowerCase() !== user.name.toLowerCase()));
    setShowTimePicker(false);
    setMultiOpen(true);
    inputRef.current?.focus();
  };

  // Send a contact request by name (or auto-accept if they invited us first).
  const sendContactRequest = async () => {
    if (!user || !addName.trim()) return;
    setAddBusy(true);
    setAddMsg(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user.name, target: addName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddMsg({ ok: false, text: data.error || "Hat nicht geklappt" });
      } else {
        setAddMsg({
          ok: true,
          text: data.status === "accepted" ? "Verbunden! 🎉" : "Anfrage gesendet ✓",
        });
        setAddName("");
        loadContacts();
      }
    } catch {
      setAddMsg({ ok: false, text: "Hat nicht geklappt" });
    }
    setAddBusy(false);
  };

  // Accept or decline an incoming contact request.
  const respondRequest = async (requester: string, accept: boolean) => {
    if (!user) return;
    try {
      await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user.name, requester, action: accept ? "accept" : "decline" }),
      });
      loadContacts();
    } catch {}
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (multiOpen && msgRecipients.length > 0) {
      sendToMultiple(input.trim());
      return;
    }
    sendMessage(input.trim());
  };

  // Who gets invited to a proposed meeting. Empty selection in the group = the
  // whole family (anyone may accept), matching the original group behaviour.
  const [inviteSel, setInviteSel] = useState<string[]>([]);
  const toggleInvite = (name: string) =>
    setInviteSel((prev) =>
      prev.some((n) => n.toLowerCase() === name.toLowerCase())
        ? prev.filter((n) => n.toLowerCase() !== name.toLowerCase())
        : [...prev, name]
    );

  const proposeMeeting = (startsAtOverride?: number) => {
    if (!user) return;
    const startsAt =
      startsAtOverride ?? zonedToEpoch(`${selectedDate}T${selectedTime}`, user.location.tz);
    const invitees = inviteSel.filter((n) => n.toLowerCase() !== user.name.toLowerCase());
    // Shared room key so every copy of this invite opens the SAME room.
    const roomKey = `treffen-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const proposal: MeetingProposal = { startsAt, proposedByTz: user.location.tz, roomKey };
    // List everyone involved on the card (so all timezones show) when >1.
    if (invitees.length > 1) proposal.invitees = invitees;

    if (invitees.length === 0) {
      // Nobody picked → keep it in the current direct chat.
      sendMessage("", proposal, undefined, conversationId!);
      return;
    }
    // Send the proposal into each invited person's direct chat (same roomKey).
    invitees.forEach((inv) => sendMessage("", { ...proposal }, undefined, dmId(user.name, inv)));
    setSelected({ type: "dm", name: invitees[0] });
  };

  // "Jetzt" → propose a meeting starting right now.
  const proposeNow = () => proposeMeeting(Date.now());

  // Accept a meeting proposal → creates the room and turns the card into a
  // "join now" card for everyone in the conversation.
  const [accepting, setAccepting] = useState<string | null>(null);
  const acceptProposal = async (msg: Message) => {
    if (!user) return;
    setAccepting(msg.id);
    try {
      const res = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, action: "accept", by: user.name }),
      });
      const data = await res.json();
      const roomName: string | undefined = data?.message?.meetingProposal?.roomName;
      // Best-effort pre-create the Daily room so entering is instant. The room
      // page also creates it lazily, so a failure here is non-fatal.
      if (roomName) {
        fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: roomName }),
        }).catch(() => {});
      }
      await loadMessages();
    } catch {}
    setAccepting(null);
  };

  // Decline a proposal → marks it as "abgesagt" for everyone.
  const declineProposal = async (msg: Message) => {
    if (!user) return;
    setAccepting(msg.id);
    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, action: "decline", by: user.name }),
      });
      await loadMessages();
    } catch {}
    setAccepting(null);
  };

  // "Andere Zeit" → open the planner prefilled with the same people.
  const proposeOtherTime = (msg: Message) => {
    const invitees = msg.meetingProposal?.invitees;
    setInviteSel(
      invitees && invitees.length
        ? invitees.filter((n) => n.toLowerCase() !== user!.name.toLowerCase())
        : selected?.type === "dm"
        ? [selected.name]
        : []
    );
    setShowTimePicker(true);
  };

  // "Erinnern" → a gentle reminder posted into the conversation.
  const remindProposal = (msg: Message) => {
    const p = msg.meetingProposal;
    if (!p) return;
    const when = timeAtEpoch(proposalEpoch(p), user!.location.tz);
    sendMessage(`⏰ Erinnerung an das Treffen um ${when} Uhr`);
  };

  const formatMessageTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  // Active conversation meta
  const activeContact =
    selected?.type === "dm" ? contacts.find((c) => c.name === selected.name) : undefined;
  const otherLocation: Location | undefined = activeContact?.location;

  // Live time conversion from input (only meaningful 1:1, where there's a partner)
  const detectedTime = findTimeInText(input);
  const convertedTime =
    user && detectedTime && otherLocation
      ? convertTimeString(detectedTime, user.location.tz, otherLocation.tz)
      : null;

  if (!user) return null;

  const otherContacts = contacts.filter((c) => c.name.toLowerCase() !== user.name.toLowerCase());

  // Resolve a participant's location by name (self or a known contact).
  const locFor = (name: string): Location | undefined =>
    name.toLowerCase() === user.name.toLowerCase()
      ? user.location
      : contacts.find((c) => c.name.toLowerCase() === name.toLowerCase())?.location;

  // Resolve a participant's profile photo by name (self or a known contact).
  const avatarFor = (name: string): string | undefined =>
    name.toLowerCase() === user.name.toLowerCase()
      ? user.avatar
      : contacts.find((c) => c.name.toLowerCase() === name.toLowerCase())?.avatar;

  // Group ids store lowercased slugs — map one back to a proper display name.
  const displayName = (slug: string): string => {
    if (slug.toLowerCase() === user.name.toLowerCase()) return user.name;
    const c = contacts.find((c) => c.name.toLowerCase() === slug.toLowerCase());
    return c ? c.name : slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  // The other members of a group (everyone except me), as display names.
  const otherMembers = (members: string[]): string[] =>
    members.filter((m) => m.toLowerCase() !== user.name.toLowerCase()).map(displayName);

  return (
    <div
      className={`relative flex h-[78vh] max-h-[760px] rounded-2xl bg-white/95 backdrop-blur-sm shadow-sm ring-1 ring-black/5 overflow-hidden ${
        selected
          ? "max-md:fixed max-md:inset-0 max-md:z-50 max-md:h-[100dvh] max-md:max-h-none max-md:rounded-none"
          : ""
      }`}
    >
        {/* ───── Sidebar: conversation list ───── */}
        <aside
          className={`${
            selected ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-80 md:border-r border-gray-100 bg-white`}
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Freunde</h2>
            <button
              onClick={() => {
                setAddOpen((o) => !o);
                setAddMsg(null);
              }}
              aria-label="Neuer Kontakt"
              title="Neuer Kontakt"
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all ${
                addOpen
                  ? "bg-violet-100 text-violet-600"
                  : "text-violet-500 hover:bg-violet-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M18 9v6m3-3h-6m-3-1a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Neuer Kontakt
            </button>
          </div>

          {addOpen && (
            <div className="border-b border-gray-100 bg-violet-50/40 px-4 py-3">
              <label className="mb-1.5 block text-xs text-gray-500">Kontakt per Name hinzufügen</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendContactRequest();
                    }
                  }}
                  placeholder="Name eingeben…"
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-base sm:text-sm text-gray-800 placeholder-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-300"
                />
                <button
                  onClick={sendContactRequest}
                  disabled={addBusy || !addName.trim()}
                  className="flex-shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-pink-600 hover:to-violet-600 disabled:opacity-40"
                >
                  {addBusy ? "…" : "Anfragen"}
                </button>
              </div>
              {addMsg && (
                <p className={`mt-1.5 text-xs ${addMsg.ok ? "text-emerald-600" : "text-rose-500"}`}>
                  {addMsg.text}
                </p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2">
            {otherContacts.length === 0 && incoming.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">
                Noch keine Freunde – tippe oben auf{" "}
                <span className="font-semibold">Neuer Kontakt</span> und füge jemanden per Name hinzu.
              </p>
            )}

            {/* Incoming contact requests */}
            {incoming.length > 0 && (
              <div className="px-3 pb-2">
                <p className="px-1 pb-1 text-xs font-semibold text-gray-500">Anfragen</p>
                {incoming.map((p) => (
                  <div key={p.name} className="flex items-center gap-2.5 px-1 py-2">
                    <Avatar name={p.name} avatar={p.avatar} className="w-10 h-10 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">möchte dich hinzufügen</p>
                    </div>
                    <button
                      onClick={() => respondRequest(p.name, true)}
                      aria-label="Annehmen"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-all hover:bg-emerald-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => respondRequest(p.name, false)}
                      aria-label="Ablehnen"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-rose-50 hover:text-rose-500"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="mt-1 border-b border-gray-100" />
              </div>
            )}

            {otherContacts.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelected({ type: "dm", name: c.name })}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selected?.type === "dm" && selected.name === c.name
                    ? "bg-violet-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={c.name} avatar={c.avatar} className="w-12 h-12" />
                  {c.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {c.location.flag} {c.location.name} · {getTimeInTimezone(c.location.tz)} Uhr
                  </p>
                </div>
                <span className="text-base">{getTimeOfDay(c.location.tz).emoji}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* ───── Conversation pane ───── */}
        <section
          className={`${
            selected ? "flex" : "hidden md:flex"
          } flex-col flex-1 min-w-0 bg-gradient-to-b from-orange-50/20 to-violet-50/20`}
        >
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Wähle eine Unterhaltung</p>
              <p className="text-gray-400 text-sm mt-1">
                Schreib der ganzen Familie oder jemandem direkt.
              </p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="flex items-center gap-3 px-4 pb-3 pt-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))] bg-white border-b border-gray-100">
                <button
                  onClick={() => window.history.back()}
                  aria-label="Zurück"
                  className="md:hidden p-2 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {selected.type === "group" ? (
                  <>
                    <div className="flex flex-shrink-0 -space-x-3">
                      {otherMembers(selected.members)
                        .slice(0, 3)
                        .map((n) => (
                          <Avatar
                            key={n}
                            name={n}
                            avatar={avatarFor(n)}
                            className="w-9 h-9 ring-2 ring-white"
                            textClassName="text-xs"
                          />
                        ))}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {otherMembers(selected.members).join(", ")}
                      </p>
                      <p className="text-xs text-gray-400">
                        Gruppe · {selected.members.length} Personen
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative flex-shrink-0">
                      <Avatar
                        name={selected.name}
                        avatar={avatarFor(selected.name)}
                        className="w-10 h-10"
                        textClassName="text-sm"
                      />
                      {activeContact?.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{selected.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {otherLocation && <span>{getTimeOfDay(otherLocation.tz).emoji}</span>}
                        {otherLocation
                          ? `${otherLocation.flag} ${getTimeInTimezone(otherLocation.tz)} Uhr · `
                          : ""}
                        {activeContact?.online ? "online" : "offline"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
                <div className="mx-auto max-w-lg space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">
                      Noch keine Nachrichten – schreib die erste! ✍️
                    </p>
                  </div>
                )}

                {messages.map((msg) => {
                  const isOwn = msg.user === user.name;

                  // ── Meeting proposal → standalone card ──
                  if (msg.meetingProposal) {
                    const p = msg.meetingProposal;
                    const startsAt = proposalEpoch(p);
                    const myLoc = user.location;
                    const involved = Array.from(
                      new Set([msg.user, ...(p.invitees || []), user.name])
                    );
                    const seen = new Set<string>([myLoc.tz]);
                    const otherRows = involved
                      .map((n) => ({ n, loc: locFor(n), avatar: avatarFor(n) }))
                      .filter(
                        (x): x is { n: string; loc: Location; avatar?: string } => !!x.loc
                      )
                      .filter((x) => (seen.has(x.loc.tz) ? false : (seen.add(x.loc.tz), true)));
                    const allLocs = [myLoc, ...otherRows.map((x) => x.loc)];
                    const asleep = allLocs.filter(
                      (loc) => !isAwakeHour(hourAtEpoch(startsAt, loc.tz))
                    );
                    const allAwake = asleep.length === 0;
                    const myAwake = isAwakeHour(hourAtEpoch(startsAt, myLoc.tz));
                    const mayRespond =
                      !isOwn &&
                      (!p.invitees ||
                        p.invitees.length === 0 ||
                        p.invitees.some((n) => n.toLowerCase() === user.name.toLowerCase()));
                    const busy = accepting === msg.id;

                    return (
                      <div key={msg.id} className="flex flex-col items-center">
                        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          {/* who proposed + status */}
                          <div className="mb-3 flex items-center gap-2">
                            <Avatar
                              name={msg.user}
                              avatar={avatarFor(msg.user)}
                              className="h-6 w-6"
                              textClassName="text-[10px]"
                            />
                            <span className="text-sm text-gray-500">
                              {isOwn ? "Dein Vorschlag" : `${msg.user} schlägt vor`}
                            </span>
                            {(() => {
                              const st = p.status;
                              const chip =
                                st === "accepted"
                                  ? { t: "zugesagt", c: "bg-emerald-100 text-emerald-700" }
                                  : st === "declined"
                                  ? { t: "abgesagt", c: "bg-rose-100 text-rose-600" }
                                  : { t: "offen", c: "bg-amber-100 text-amber-700" };
                              return (
                                <span
                                  className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chip.c}`}
                                >
                                  {chip.t}
                                </span>
                              );
                            })()}
                          </div>

                          {/* hero: viewer's own time, the most important thing */}
                          <div className="mb-3">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold leading-none text-gray-900">
                                {timeAtEpoch(startsAt, myLoc.tz)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {dayLabel(startsAt, myLoc.tz)}
                              </span>
                              <DayNight awake={myAwake} className="ml-auto h-5 w-5" />
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              {myLoc.flag} deine Zeit in {myLoc.name}
                            </p>
                          </div>

                          {/* the others' times + the awake check */}
                          <div className="mb-4 space-y-2.5 border-t border-gray-100 pt-3">
                            {otherRows.map((x) => (
                              <PersonTimeRow
                                key={x.loc.tz}
                                name={x.n}
                                avatar={x.avatar}
                                location={x.loc}
                                startsAt={startsAt}
                              />
                            ))}
                            <AwakeBar ok={allAwake} asleepNames={asleep.map((l) => l.name)} />
                          </div>

                          {/* state-specific action */}
                          {p.status === "accepted" && p.roomName ? (
                            <>
                              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Zugesagt von {p.acceptedBy} – Raum ist offen!
                              </p>
                              <button
                                onClick={() => router.push(`/room/${p.roomName}`)}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-pink-600 hover:to-violet-600"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Jetzt eintreten
                              </button>
                              <button
                                onClick={() => remindProposal(msg)}
                                className="mt-2 w-full py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600"
                              >
                                ⏰ Erinnern
                              </button>
                            </>
                          ) : p.status === "declined" ? (
                            <>
                              <p className="mb-2 text-center text-xs text-rose-500">
                                Abgesagt von {p.declinedBy}
                              </p>
                              <button
                                onClick={() => proposeOtherTime(msg)}
                                className="w-full rounded-xl bg-gray-50 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-all hover:bg-gray-100"
                              >
                                Andere Zeit vorschlagen
                              </button>
                            </>
                          ) : mayRespond ? (
                            <>
                              <button
                                onClick={() => acceptProposal(msg)}
                                disabled={busy}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-green-600 disabled:opacity-60"
                              >
                                {busy ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Zusagen &amp; eintreten
                                  </>
                                )}
                              </button>
                              <div className="mt-3 flex justify-center gap-5">
                                <button
                                  onClick={() => proposeOtherTime(msg)}
                                  className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                  Andere Zeit
                                </button>
                                <button
                                  onClick={() => declineProposal(msg)}
                                  disabled={busy}
                                  className="text-sm text-gray-400 hover:text-rose-500 disabled:opacity-60"
                                >
                                  Absagen
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="mb-2 text-center text-xs text-gray-400">
                                ⏳ Warte auf Zusage …
                              </p>
                              <button
                                onClick={() => proposeOtherTime(msg)}
                                className="w-full rounded-xl bg-gray-50 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-all hover:bg-gray-100"
                              >
                                Andere Zeit
                              </button>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {formatMessageTime(msg.timestamp)}
                        </p>
                      </div>
                    );
                  }

                  // ── Video room invite → standalone card ──
                  if (msg.roomInvite) {
                    return (
                      <div key={msg.id} className="flex flex-col items-center">
                        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
                              <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800">Video-Raum</p>
                              <p className="truncate text-xs text-gray-400">
                                {isOwn ? "Du hast eingeladen" : `${msg.user} lädt ein`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => router.push(`/room/${msg.roomInvite!.name}`)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-pink-600 hover:to-violet-600"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Komm rein!
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {formatMessageTime(msg.timestamp)}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                      {!isOwn && selected.type === "group" && (
                        <Avatar
                          name={msg.user}
                          avatar={avatarFor(msg.user)}
                          className="w-8 h-8 mt-5 flex-shrink-0"
                          textClassName="text-xs"
                        />
                      )}
                      <div className="max-w-[85%]">
                        {!isOwn && selected.type === "group" && (
                          <p className="text-xs font-medium text-gray-500 mb-1 ml-1">{msg.user}</p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-br-md"
                              : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>

                          {msg.broadcast && msg.broadcast.length > 1 && (() => {
                            const others = msg.broadcast.filter(
                              (n) =>
                                n.toLowerCase() !== msg.user.toLowerCase() &&
                                n.toLowerCase() !== user.name.toLowerCase()
                            );
                            const label = isOwn
                              ? `an ${msg.broadcast
                                  .filter((n) => n.toLowerCase() !== user.name.toLowerCase())
                                  .join(", ")}`
                              : others.length
                              ? `auch an ${others.join(", ")}`
                              : null;
                            return (
                              <div
                                className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${
                                  isOwn ? "text-white/70" : "text-gray-400"
                                }`}
                              >
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-1.5-5.6" />
                                </svg>
                                {label && <span className="truncate">{label}</span>}
                                {!isOwn && (
                                  <button
                                    onClick={() => replyAll(msg.broadcast!)}
                                    className="ml-auto flex-shrink-0 font-medium text-violet-500 underline-offset-2 hover:underline"
                                  >
                                    Allen antworten
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          <p className={`text-[10px] mt-1 ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                            {formatMessageTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Time picker */}
              {showTimePicker && (
                <div className="bg-white border-t border-gray-100 px-4 py-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Treffen vorschlagen</h3>
                    <button
                      onClick={() => setShowTimePicker(false)}
                      aria-label="Schließen"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Jetzt / Später — first decision, one toggle instead of two buttons */}
                  <div className="mb-4 flex rounded-full bg-gray-100 p-1">
                    {(["now", "later"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPlanMode(m)}
                        className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                          planMode === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                        }`}
                      >
                        {m === "now" ? "Jetzt sofort" : "Später planen"}
                      </button>
                    ))}
                  </div>

                  {/* Mit wem? */}
                  {otherContacts.length > 0 && (
                    <div className="mb-4">
                      <label className="mb-2 block text-xs text-gray-500">Mit wem?</label>
                      <div className="flex flex-wrap gap-1.5">
                        {otherContacts.map((c) => {
                          const on = inviteSel.some(
                            (n) => n.toLowerCase() === c.name.toLowerCase()
                          );
                          return (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => toggleInvite(c.name)}
                              className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition-all ${
                                on
                                  ? "border-violet-300 bg-violet-100 text-violet-700"
                                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <Avatar
                                name={c.name}
                                avatar={c.avatar}
                                className="h-5 w-5"
                                textClassName="text-[10px]"
                              />
                              {c.name}
                              {on ? (
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tag + Uhrzeit — only when planning for later */}
                  {planMode === "later" && (
                    <div className="mb-4 flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-500">Tag</label>
                        <select
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-base sm:text-sm text-gray-700 focus:border-violet-300 focus:ring-2 focus:ring-violet-300"
                        >
                          {Array.from({ length: 7 }, (_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() + i);
                            const val = d.toISOString().split("T")[0];
                            const label =
                              i === 0
                                ? "Heute"
                                : i === 1
                                ? "Morgen"
                                : d.toLocaleDateString("de-DE", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "numeric",
                                  });
                            return (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Uhrzeit</label>
                        <div className="flex items-center gap-1">
                          <select
                            value={selectedTime.split(":")[0]}
                            onChange={(e) =>
                              setSelectedTime(`${e.target.value}:${selectedTime.split(":")[1]}`)
                            }
                            className="rounded-xl border border-gray-200 bg-gray-50/60 px-2.5 py-2 text-base sm:text-sm text-gray-700 focus:border-violet-300 focus:ring-2 focus:ring-violet-300"
                          >
                            {Array.from({ length: 24 }, (_, h) => {
                              const hh = String(h).padStart(2, "0");
                              return (
                                <option key={hh} value={hh}>
                                  {hh}
                                </option>
                              );
                            })}
                          </select>
                          <span className="font-semibold text-gray-400">:</span>
                          <select
                            value={selectedTime.split(":")[1]}
                            onChange={(e) =>
                              setSelectedTime(`${selectedTime.split(":")[0]}:${e.target.value}`)
                            }
                            className="rounded-xl border border-gray-200 bg-gray-50/60 px-2.5 py-2 text-base sm:text-sm text-gray-700 focus:border-violet-300 focus:ring-2 focus:ring-violet-300"
                          >
                            {["00", "15", "30", "45"].map((mm) => (
                              <option key={mm} value={mm}>
                                {mm}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live preview — same building block as the chat card */}
                  {(() => {
                    const startsAt =
                      planMode === "now"
                        ? Date.now()
                        : zonedToEpoch(`${selectedDate}T${selectedTime}`, user.location.tz);
                    const names = Array.from(new Set([user.name, ...inviteSel]));
                    const seen = new Set<string>();
                    const rows = names
                      .map((n) => ({ n, loc: locFor(n), avatar: avatarFor(n) }))
                      .filter(
                        (x): x is { n: string; loc: Location; avatar?: string } => !!x.loc
                      )
                      .filter((x) => (seen.has(x.loc.tz) ? false : (seen.add(x.loc.tz), true)));
                    const asleep = rows
                      .map((x) => x.loc)
                      .filter((loc) => !isAwakeHour(hourAtEpoch(startsAt, loc.tz)));
                    const ok = asleep.length === 0;
                    return (
                      <div className="mb-4 space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                        {rows.map((x) => (
                          <PersonTimeRow
                            key={x.loc.tz}
                            name={x.n}
                            avatar={x.avatar}
                            location={x.loc}
                            startsAt={startsAt}
                          />
                        ))}
                        <AwakeBar ok={ok} asleepNames={asleep.map((l) => l.name)} />
                      </div>
                    );
                  })()}

                  {/* One primary action, colored by mode */}
                  <button
                    onClick={planMode === "now" ? proposeNow : () => proposeMeeting()}
                    disabled={sending}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-sm transition-all disabled:opacity-50 ${
                      planMode === "now"
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                        : "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                    }`}
                  >
                    {planMode === "now" && (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    )}
                    {planMode === "now" ? "Jetzt treffen" : "Vorschlagen"}
                  </button>
                </div>
              )}

              {/* Input bar */}
              <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {detectedTime && convertedTime && otherLocation && (
                  <div className="mb-3">
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-2.5 shadow-sm">
                      {(() => {
                        const otherHour = parseInt(convertedTime.split(":")[0], 10);
                        const myHour = parseInt(detectedTime.split(":")[0], 10);
                        const ok = isAwakeHour(myHour) && isAwakeHour(otherHour);
                        return (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-gray-800 flex items-center gap-1">
                                {user.location.flag} {detectedTime} Uhr
                              </span>
                              <span className="text-gray-400 font-medium">=</span>
                              <span className="font-bold text-gray-800 flex items-center gap-1">
                                {otherLocation.flag} {convertedTime} Uhr
                              </span>
                              <span className="ml-auto text-lg">{ok ? "👍" : "🙁"}</span>
                            </div>
                            <div className="text-[10px] text-violet-500 mt-1">
                              <p>
                                {ok
                                  ? `Passt – ${user.location.name} & ${otherLocation.name} sind beide wach!`
                                  : `Achtung – in ${
                                      isAwakeHour(myHour) ? otherLocation.name : user.location.name
                                    } schläft man da wahrscheinlich 😴`}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {/* Recipient picker — send the same message to several friends */}
                {multiOpen && (
                  <div className="mb-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">An mehrere senden</span>
                      <button
                        onClick={() => setMultiOpen(false)}
                        aria-label="Schließen"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {otherContacts.map((c) => {
                        const on = msgRecipients.some(
                          (n) => n.toLowerCase() === c.name.toLowerCase()
                        );
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => toggleRecipient(c.name)}
                            className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition-all ${
                              on
                                ? "border-violet-300 bg-violet-100 text-violet-700"
                                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            <Avatar name={c.name} avatar={c.avatar} className="h-5 w-5" textClassName="text-[10px]" />
                            {c.name}
                            {on ? (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {msgRecipients.length === 0
                        ? "Wähle, wer die Nachricht bekommen soll."
                        : `Geht an ${msgRecipients.length} ${
                            msgRecipients.length === 1 ? "Person" : "Personen"
                          } – jede:r einzeln.`}
                    </p>
                  </div>
                )}
                <div className="flex items-end gap-1">
                  <button
                    onClick={() => {
                      const opening = !showTimePicker;
                      setShowTimePicker(opening);
                      if (opening) {
                        setMultiOpen(false);
                        setInviteSel(selected.type === "dm" ? [selected.name] : []);
                      }
                    }}
                    className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                      showTimePicker
                        ? "bg-violet-100 text-violet-600"
                        : "text-gray-400 hover:text-violet-500 hover:bg-violet-50"
                    }`}
                    title="Zeit vorschlagen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const opening = !multiOpen;
                      setMultiOpen(opening);
                      if (opening) {
                        setShowTimePicker(false);
                        setMsgRecipients(selected.type === "dm" ? [selected.name] : []);
                      }
                    }}
                    className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                      multiOpen
                        ? "bg-violet-100 text-violet-600"
                        : "text-gray-400 hover:text-violet-500 hover:bg-violet-50"
                    }`}
                    title="An mehrere senden"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-1.5-5.6"
                      />
                    </svg>
                  </button>
                  <div className="relative flex-1 min-w-0">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onPointerDown={() => setEmojiOpen(false)}
                      placeholder={multiOpen ? "Nachricht an mehrere…" : "Schreib was…"}
                      className="w-full resize-none max-h-32 pl-4 pr-4 sm:pr-11 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-300 focus:border-violet-300 bg-gray-50/60 text-gray-800 placeholder-gray-400 transition-all text-base sm:text-sm leading-snug"
                    />
                    {/* Emoji picker is desktop-only — on mobile the system
                        keyboard already provides emojis. */}
                    <button
                      onClick={() => setEmojiOpen((o) => !o)}
                      className={`hidden sm:block absolute bottom-1.5 right-1.5 p-1.5 rounded-lg transition-all ${
                        emojiOpen
                          ? "bg-violet-100 text-violet-600"
                          : "text-gray-400 hover:text-violet-500 hover:bg-violet-50"
                      }`}
                      title="Emoji"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                    {emojiOpen && (
                      <div className="absolute bottom-full right-0 z-30 mb-2 grid w-64 grid-cols-8 gap-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => insertEmoji(e)}
                            className="rounded-lg p-1 text-xl leading-none hover:bg-gray-100"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="p-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
  );
}
