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
import {
  GROUP_ID,
  GROUP_NAME,
  dmId,
  type Selection,
} from "../lib/conversation";

interface User {
  name: string;
  location: Location;
}

interface Contact {
  name: string;
  location: Location;
  online: boolean;
  lastSeen: number;
}

interface MeetingProposal {
  startsAt?: number; // absolute epoch (ms) — missing on legacy proposals
  proposedByTz?: string;
  invitees?: string[];
  status?: "pending" | "accepted";
  acceptedBy?: string;
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

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  const [sending, setSending] = useState(false);
  const [, setTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Presence heartbeat + contacts polling
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      fetch("/api/chat/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, timezone: user.location.tz, online: true }),
      }).catch(() => {});
    };
    const loadContacts = async () => {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        setContacts(data.users || []);
      } catch {}
    };
    beat();
    loadContacts();
    const id = setInterval(() => {
      beat();
      loadContacts();
    }, 4000);
    return () => clearInterval(id);
  }, [user]);

  const conversationId = user && selected
    ? selected.type === "group"
      ? GROUP_ID
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSend = () => {
    if (!input.trim()) return;
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

  const proposeMeeting = () => {
    if (!user) return;
    const startsAt = zonedToEpoch(`${selectedDate}T${selectedTime}`, user.location.tz);
    const proposal: MeetingProposal = { startsAt, proposedByTz: user.location.tz };
    const invitees = inviteSel.filter((n) => n.toLowerCase() !== user.name.toLowerCase());
    if (invitees.length > 0) proposal.invitees = invitees;

    // More than one invitee → post into the shared family thread so everyone
    // selected sees it; otherwise keep it in the current conversation.
    let target = conversationId!;
    if (invitees.length > 1) {
      target = GROUP_ID;
      setSelected({ type: "group" });
    }
    sendMessage("", proposal, undefined, target);
  };

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

  return (
    <div className="min-h-screen sm:p-6 bg-gradient-to-b from-orange-50/40 via-rose-50/30 to-violet-50/40">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto flex h-screen sm:h-[85vh] sm:max-h-[820px] bg-white/95 backdrop-blur-sm sm:rounded-3xl shadow-sm sm:ring-1 sm:ring-black/5 overflow-hidden">
        {/* ───── Sidebar: conversation list ───── */}
        <aside
          className={`${
            selected ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-80 md:border-r border-gray-100 bg-white`}
        >
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="Zurück zum Dashboard"
              className="p-2 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">Chats</h1>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {/* Group conversation */}
            <button
              onClick={() => setSelected({ type: "group" })}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                selected?.type === "group" ? "bg-violet-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-1.5-5.6"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 truncate">{GROUP_NAME}</p>
                <p className="text-xs text-gray-400 truncate">Alle zusammen</p>
              </div>
            </button>

            <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-300">
              Direktnachrichten
            </div>

            {otherContacts.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">
                Noch niemand sonst registriert.
              </p>
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
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarGradient(
                      c.name
                    )} flex items-center justify-center`}
                  >
                    <span className="text-white font-bold">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
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
              <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Zurück"
                  className="md:hidden p-2 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {selected.type === "group" ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-1.5-5.6"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{GROUP_NAME}</p>
                      <p className="text-xs text-gray-400">
                        {contacts.length} {contacts.length === 1 ? "Mitglied" : "Mitglieder"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(
                          selected.name
                        )} flex items-center justify-center`}
                      >
                        <span className="text-white font-bold text-sm">
                          {selected.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
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
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">
                      Noch keine Nachrichten – schreib die erste! ✍️
                    </p>
                  </div>
                )}

                {messages.map((msg) => {
                  const isOwn = msg.user === user.name;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
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
                          <p className="text-sm">{msg.text}</p>

                          {/* Meeting proposal */}
                          {msg.meetingProposal && (
                            <div
                              className={`mt-2 p-3 rounded-xl ${
                                isOwn ? "bg-white/20" : "bg-violet-50 border border-violet-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📅</span>
                                <span className={`text-xs font-medium ${isOwn ? "text-white/80" : "text-gray-500"}`}>
                                  Treffenvorschlag
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {(() => {
                                  const p = msg.meetingProposal!;
                                  const startsAt = proposalEpoch(p);
                                  const names = Array.from(
                                    new Set([msg.user, ...(p.invitees || []), user.name])
                                  );
                                  const seen = new Set<string>();
                                  const rows = names
                                    .map((n) => locFor(n))
                                    .filter((loc): loc is Location => !!loc)
                                    .filter((loc) => (seen.has(loc.tz) ? false : (seen.add(loc.tz), true)));
                                  const allAwake = rows.every((loc) =>
                                    isAwakeHour(hourAtEpoch(startsAt, loc.tz))
                                  );
                                  return (
                                    <>
                                      {rows.map((loc) => (
                                        <div key={loc.tz} className="flex items-center gap-2">
                                          <span className="text-base">{loc.flag}</span>
                                          <span className={`text-sm font-semibold ${isOwn ? "text-white" : "text-gray-800"}`}>
                                            {timeAtEpoch(startsAt, loc.tz)} Uhr
                                          </span>
                                          <span className={`text-xs ${isOwn ? "text-white/70" : "text-gray-400"}`}>
                                            {loc.name}
                                          </span>
                                        </div>
                                      ))}
                                      <p className={`text-xs mt-1 ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                                        {dayLabel(startsAt, user.location.tz)} ·{" "}
                                        {allAwake ? "👍 alle wach" : "🙁 jemand schläft evtl."}
                                      </p>
                                      {p.invitees && p.invitees.length > 0 && (
                                        <p className={`text-xs ${isOwn ? "text-white/70" : "text-gray-500"}`}>
                                          👥 {p.invitees.join(", ")}
                                        </p>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Plan → accept → enter flow */}
                              {msg.meetingProposal.status === "accepted" &&
                              msg.meetingProposal.roomName ? (
                                <div className="mt-3">
                                  <p
                                    className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${
                                      isOwn ? "text-white/90" : "text-emerald-600"
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Zugesagt von {msg.meetingProposal.acceptedBy} – Raum ist offen!
                                  </p>
                                  <button
                                    onClick={() => router.push(`/room/${msg.meetingProposal!.roomName}`)}
                                    className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                      isOwn
                                        ? "bg-white text-violet-600 hover:bg-white/90"
                                        : "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600 shadow-sm"
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Jetzt eintreten
                                  </button>
                                </div>
                              ) : isOwn ? (
                                <p className={`mt-3 text-xs ${isOwn ? "text-white/70" : "text-gray-400"}`}>
                                  ⏳ Warte auf Zusage …
                                </p>
                              ) : !msg.meetingProposal.invitees ||
                                msg.meetingProposal.invitees.length === 0 ||
                                msg.meetingProposal.invitees.some(
                                  (n) => n.toLowerCase() === user.name.toLowerCase()
                                ) ? (
                                <button
                                  onClick={() => acceptProposal(msg)}
                                  disabled={accepting === msg.id}
                                  className="mt-3 w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-sm disabled:opacity-60"
                                >
                                  {accepting === msg.id ? (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Annehmen &amp; eintreten
                                    </>
                                  )}
                                </button>
                              ) : (
                                <p className="mt-3 text-xs text-gray-400">
                                  Nur Eingeladene können zusagen
                                </p>
                              )}
                            </div>
                          )}

                          {/* Video room invite */}
                          {msg.roomInvite && (
                            <div
                              className={`mt-2 p-3 rounded-xl ${
                                isOwn ? "bg-white/20" : "bg-rose-50 border border-rose-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                    isOwn ? "bg-white/25" : "bg-rose-100"
                                  }`}
                                >
                                  <svg
                                    className={`w-4 h-4 ${isOwn ? "text-white" : "text-rose-500"}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.8}
                                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                </span>
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold leading-tight ${isOwn ? "text-white" : "text-gray-800"}`}>
                                    Video-Raum
                                  </p>
                                  <p className={`text-[11px] truncate ${isOwn ? "text-white/70" : "text-gray-400"}`}>
                                    {msg.roomInvite.name}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => router.push(`/room/${msg.roomInvite!.name}`)}
                                className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                  isOwn
                                    ? "bg-white text-rose-500 hover:bg-white/90"
                                    : "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600 shadow-sm"
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                  />
                                </svg>
                                Komm rein!
                              </button>
                            </div>
                          )}

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

              {/* Time picker */}
              {showTimePicker && (
                <div className="bg-white border-t border-gray-100 px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700 text-sm">📅 Treffen vorschlagen</h3>
                    <button onClick={() => setShowTimePicker(false)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {otherContacts.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1.5">
                        Wen einladen?
                      </label>
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
                              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                                on
                                  ? "border-violet-300 bg-violet-100 text-violet-700"
                                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
                                  c.name
                                )} text-[10px] font-bold text-white`}
                              >
                                {c.name.charAt(0).toUpperCase()}
                              </span>
                              {c.name}
                              {on && (
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        {inviteSel.length === 0
                          ? "Niemand ausgewählt = ganze Familie kann zusagen"
                          : inviteSel.length === 1
                          ? "1 Person eingeladen"
                          : `${inviteSel.length} Personen eingeladen`}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Tag</label>
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/60 text-gray-700 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
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
                      <label className="block text-xs text-gray-500 mb-1">Uhrzeit</label>
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedTime.split(":")[0]}
                          onChange={(e) =>
                            setSelectedTime(`${e.target.value}:${selectedTime.split(":")[1]}`)
                          }
                          className="px-2.5 py-2 border border-gray-200 rounded-xl bg-gray-50/60 text-gray-700 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
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
                          className="px-2.5 py-2 border border-gray-200 rounded-xl bg-gray-50/60 text-gray-700 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
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
                  {(() => {
                    const startsAt = zonedToEpoch(`${selectedDate}T${selectedTime}`, user.location.tz);
                    // Who's involved in the preview: me + the people I'm inviting
                    // (in a 1:1 the partner is preselected). Dedupe by timezone.
                    const names = Array.from(new Set([user.name, ...inviteSel]));
                    const seen = new Set<string>();
                    const rows = names
                      .map((n) => locFor(n))
                      .filter((loc): loc is Location => !!loc)
                      .filter((loc) => (seen.has(loc.tz) ? false : (seen.add(loc.tz), true)));
                    const asleep = rows.filter((loc) => !isAwakeHour(hourAtEpoch(startsAt, loc.tz)));
                    const ok = asleep.length === 0;
                    return (
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-3">
                        <p className="text-xs text-gray-500 mb-2">⏰ So wird es angezeigt:</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {rows.map((loc) => (
                            <div key={loc.tz} className="flex items-center gap-1.5">
                              <span>{loc.flag}</span>
                              <span className="text-sm font-semibold text-gray-700">
                                {timeAtEpoch(startsAt, loc.tz)} Uhr
                              </span>
                              <span className="text-[11px] text-gray-400 truncate">{loc.name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{dayLabel(startsAt, user.location.tz)}</p>
                        <div className="mt-2 flex items-start gap-1.5 border-t border-violet-100 pt-2">
                          <span className="text-base leading-none">{ok ? "👍" : "🙁"}</span>
                          <div className="text-xs">
                            <p className={ok ? "font-medium text-green-600" : "font-medium text-rose-500"}>
                              {ok ? "Passt – alle sind wach!" : "Schwierig – da schläft jemand"}
                            </p>
                            {!ok && (
                              <p className="text-amber-600">
                                {asleep.map((l) => l.name).join(", ")} schläft wahrscheinlich 😴
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <button
                    onClick={proposeMeeting}
                    disabled={sending}
                    className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    Zeit vorschlagen!
                  </button>
                </div>
              )}

              {/* Input bar */}
              <div className="bg-white border-t border-gray-100 px-3 py-3">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const opening = !showTimePicker;
                      setShowTimePicker(opening);
                      if (opening)
                        setInviteSel(
                          selected.type === "dm" ? [selected.name] : []
                        );
                    }}
                    className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
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
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Schreib was... (z.B. 15:00 für Umrechnung)"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300 focus:border-violet-300 bg-gray-50/60 text-gray-800 placeholder-gray-400 transition-all text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
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
    </div>
  );
}
