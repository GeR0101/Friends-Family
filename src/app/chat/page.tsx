"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  type TimezoneId,
  timezoneDisplayName,
  convertTimeString,
  findTimeInText,
  isTimeInOverlap,
  getTimeContext,
} from "../lib/timezone";
import WorldMap from "../lib/worldmap";

interface User {
  name: string;
  timezone: "bali" | "austria";
}

interface MeetingProposal {
  time: string;
  fromTimezone: string;
  baliTime: string;
  austriaTime: string;
  dateLabel: string;
}

interface Message {
  id: string;
  user: string;
  text: string;
  timezone: "bali" | "austria";
  timestamp: number;
  meetingProposal?: MeetingProposal;
}

function convertTime(
  dateStr: string,
  timeStr: string,
  fromTz: "bali" | "austria"
): MeetingProposal {
  const fromIana = fromTz === "bali" ? "Asia/Makassar" : "Europe/Vienna";

  // Parse the date and time in the source timezone
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Create date parts in the source timezone
  const utcDate = new Date();
  // We'll use a different approach: construct a date string in the source timezone
  const dateStrInTz = `${dateStr}T${timeStr.padStart(5, "0")}:00`;

  // Use Intl to figure out the UTC offset for that date in the source timezone
  // Then manually compute UTC, then format for target
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: fromIana,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Get the UTC equivalent by trying different offsets
  // Simpler approach: try to get the offset for that date
  const now = new Date();
  now.setFullYear(year, month - 1, day);
  now.setHours(hours, minutes, 0, 0);

  // Get timezone offset for source timezone
  const tzOffset = (tz: string, d: Date): number => {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      timeZoneName: "longOffset",
    };
    const parts = new Intl.DateTimeFormat("en", opts).formatToParts(d);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "";
    const match = tzPart.match(/UTC([+-]\d{1,2}):?(\d{2})?/);
    if (match) {
      const hours = parseInt(match[1]);
      const mins = parseInt(match[2] || "0");
      return hours * 60 + (hours < 0 ? -mins : mins);
    }
    // Fallback: known offsets
    if (tz === "Asia/Makassar") return 8 * 60;
    if (tz === "Europe/Vienna") {
      // Check if it's summer (DST)
      const jan = new Date(d.getFullYear(), 0, 1);
      const jul = new Date(d.getFullYear(), 6, 1);
      const janOff = -jan.getTimezoneOffset();
      const julOff = -jul.getTimezoneOffset();
      const isDST = d.getTimezoneOffset() < Math.max(janOff, julOff) ? false : true;
      // Actually, let's just use a simpler check
      const month = d.getMonth();
      // DST in Austria: last Sunday of March to last Sunday of October
      return month >= 2 && month <= 9 ? 2 * 60 : 1 * 60;
    }
    return 0;
  };

  const sourceOffset = tzOffset(fromIana, now); // in minutes
  const utcMinutes = hours * 60 + minutes - sourceOffset;

  // Now compute target time
  const targetIana = fromTz === "bali" ? "Europe/Vienna" : "Asia/Makassar";
  const targetOffset = tzOffset(targetIana, now);

  const targetTotalMinutes = utcMinutes + targetOffset;
  const targetHours = ((targetTotalMinutes % 1440) + 1440) % 1440;
  const targetDay = Math.floor(targetTotalMinutes / 1440);

  const targetH = Math.floor(targetHours / 60);
  const targetM = Math.round(targetHours % 60);

  const sourceHours = hours;
  const sourceMins = minutes;

  // Date labels
  const sourceLabel = formatDateLabel(dateStr, fromTz);
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + targetDay - 0); // we set the target date

  // Actually let me recalculate more carefully
  const sourceDateObj = new Date(Date.UTC(year, month - 1, day, hours - sourceOffset / 60, minutes - (sourceOffset % 60)));
  const targetDateObj = new Date(sourceDateObj.getTime());

  const targetDateStr = targetDateObj.toLocaleDateString("en-CA", {
    timeZone: targetIana,
  });

  const targetTimeStr = targetDateObj.toLocaleTimeString("de-DE", {
    timeZone: targetIana,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const sourceTimeStr = `${String(sourceHours).padStart(2, "0")}:${String(sourceMins).padStart(2, "0")}`;

  return {
    time: `${dateStr}T${timeStr}`,
    fromTimezone: fromTz,
    baliTime: fromTz === "bali" ? sourceTimeStr : targetTimeStr,
    austriaTime: fromTz === "austria" ? sourceTimeStr : targetTimeStr,
    dateLabel: `${formatDateLabel(dateStr, fromTz)} / ${formatDateLabel(targetDateStr, targetIana === "Asia/Makassar" ? "bali" : "austria")}`,
  };
}

function formatDateLabel(dateStr: string, tz: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
    return "Heute";
  if (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  )
    return "Morgen";

  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ff_user");
    if (!saved) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(saved));
  }, [router]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      setMessages(data.messages.reverse());
    } catch {}
  }, []);

  useEffect(() => {
    loadMessages();
    pollingRef.current = setInterval(loadMessages, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (
    text: string,
    meetingProposal?: MeetingProposal
  ) => {
    if (!user || (!text.trim() && !meetingProposal)) return;
    setSending(true);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: user.name,
          text: meetingProposal
            ? `📅 ${user.name} schlägt ein Treffen vor:`
            : text,
          timezone: user.timezone,
          meetingProposal,
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

  const proposeMeeting = () => {
    if (!user) return;
    const proposal = convertTime(selectedDate, selectedTime, user.timezone);
    sendMessage("", proposal);
  };

  const formatMessageTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Live time conversion from input
  const detectedTime = findTimeInText(input);
  const otherTz: TimezoneId = user?.timezone === "bali" ? "austria" : "bali";
  const convertedTime = user && detectedTime
    ? convertTimeString(detectedTime, user.timezone, otherTz)
    : null;
  const austriaTime = user?.timezone === "austria" ? detectedTime : convertedTime;
  const baliTime = user?.timezone === "bali" ? detectedTime : convertedTime;
  const timeContext = user && austriaTime && baliTime
    ? getTimeContext(austriaTime, baliTime)
    : null;

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-100 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100 rounded-full opacity-20 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative bg-white border-b-2 border-pink-100 px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-800">Family Chat</h1>
        </div>
      </div>

      {/* World map with day/night */}
      <div className="px-4 pt-3">
        <WorldMap />
      </div>

      {/* Messages area */}
      <div className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Noch keine Nachrichten</p>
            <p className="text-gray-400 text-sm mt-1">
              Schreib die erste Nachricht oder schlag eine Zeit vor!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user === user.name;
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${
                  isOwn ? "order-1" : "order-1"
                }`}
              >
                {/* Sender name */}
                {!isOwn && (
                  <p className="text-xs font-medium text-gray-500 mb-1 ml-1">
                    {msg.user}
                  </p>
                )}

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-br-md"
                      : "bg-white border-2 border-pink-100 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>

                  {/* Meeting proposal */}
                  {msg.meetingProposal && (
                    <div
                      className={`mt-2 p-3 rounded-xl ${
                        isOwn
                          ? "bg-white/20"
                          : "bg-purple-50 border border-purple-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📅</span>
                        <span
                          className={`text-xs font-medium ${
                            isOwn ? "text-white/80" : "text-gray-500"
                          }`}
                        >
                          Treffenvorschlag
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🇦🇹</span>
                          <span
                            className={`text-sm font-semibold ${
                              isOwn ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {msg.meetingProposal.austriaTime} Uhr
                          </span>
                          <span
                            className={`text-xs ${
                              isOwn ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            Österreich
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🇮🇩</span>
                          <span
                            className={`text-sm font-semibold ${
                              isOwn ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {msg.meetingProposal.baliTime} Uhr
                          </span>
                          <span
                            className={`text-xs ${
                              isOwn ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            Bali
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? "text-white/60" : "text-gray-400"
                          }`}
                        >
                          {msg.meetingProposal.dateLabel}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p
                    className={`text-[10px] mt-1 ${
                      isOwn ? "text-white/60" : "text-gray-400"
                    }`}
                  >
                    {formatMessageTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Time picker modal */}
      {showTimePicker && (
        <div className="relative bg-white border-t-2 border-purple-100 px-4 py-4 shadow-lg z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">
              📅 Treffen vorschlagen
            </h3>
            <button
              onClick={() => setShowTimePicker(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Tag</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-pink-100 rounded-xl bg-pink-50/50 text-gray-700 text-sm focus:ring-2 focus:ring-pink-300 focus:border-pink-300"
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
            <div className="w-28">
              <label className="block text-xs text-gray-500 mb-1">Uhrzeit</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border-2 border-pink-100 rounded-xl bg-pink-50/50 text-gray-700 text-sm focus:ring-2 focus:ring-pink-300 focus:border-pink-300"
              />
            </div>
          </div>

          {/* Preview */}
          {user && (() => {
            const preview = convertTime(
              selectedDate,
              selectedTime,
              user.timezone
            );
            return (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-3">
                <p className="text-xs text-gray-500 mb-2">
                  ⏰ So wird es angezeigt:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span>🇦🇹</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {preview.austriaTime} Uhr
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>🇮🇩</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {preview.baliTime} Uhr
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {preview.dateLabel}
                </p>
              </div>
            );
          })()}

          <button
            onClick={proposeMeeting}
            disabled={sending}
            className="w-full py-2.5 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            Zeit vorschlagen!
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="relative bg-white border-t-2 border-pink-100 px-3 py-3 z-10">
        {/* Live time conversion preview as bubble */}
        {user && detectedTime && convertedTime && (
          <div className="mb-3 relative">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-gray-800 flex items-center gap-1">
                  {user.timezone === "austria" ? "🇦🇹" : "🇮🇩"} {detectedTime} Uhr
                </span>
                <span className="text-gray-400 font-medium">=</span>
                <span className="font-bold text-gray-800 flex items-center gap-1">
                  {user.timezone === "bali" ? "🇦🇹" : "🇮🇩"} {convertedTime} Uhr
                </span>
                <span className="ml-auto text-lg">
                  {isTimeInOverlap(detectedTime, user.timezone) ? "👍" : "🙁"}
                </span>
              </div>
              <div className="text-[10px] text-purple-500 mt-1 space-y-0.5">
                <p>
                  {isTimeInOverlap(detectedTime, user.timezone)
                    ? "Passt perfekt – ihr seid beide wach!"
                    : "Achtung – außerhalb der gemeinsamen Wachzeit"}
                </p>
                {timeContext && (
                  <p className="text-amber-600 font-medium">
                    {timeContext}
                  </p>
                )}
              </div>
            </div>
            {/* Tail pointing down to the input */}
            <div className="absolute left-8 -bottom-[5px] w-2.5 h-2.5 bg-purple-50 border-r border-b border-purple-200 transform rotate-45 rounded-sm" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTimePicker(!showTimePicker)}
            className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
              showTimePicker
                ? "bg-purple-100 text-purple-600"
                : "text-gray-400 hover:text-purple-500 hover:bg-purple-50"
            }`}
            title="Zeit vorschlagen"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            className="flex-1 px-4 py-2.5 border-2 border-pink-100 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-300 bg-pink-50/50 text-gray-800 placeholder-gray-400 transition-all text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
    </div>
  );
}