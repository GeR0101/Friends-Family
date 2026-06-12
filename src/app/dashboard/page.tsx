"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type TimezoneId,
  getTimezoneLabel,
} from "../lib/timezone";
import WorldMap from "../lib/worldmap";

interface User {
  name: string;
  timezone: TimezoneId;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [roomName, setRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("ff_user");
    if (!saved) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(saved));

    // Announce online status
    const savedUser = JSON.parse(saved);
    fetch("/api/chat/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: savedUser.name,
        timezone: savedUser.timezone,
        online: true,
      }),
    });

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/users");
        const data = await res.json();
        setOnlineUsers(
          data.users
            .filter((u: any) => u.online)
            .map((u: any) => u.name)
        );
      } catch {}
    }, 3000);

    // Set offline on unmount
    return () => {
      clearInterval(interval);
      fetch("/api/chat/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: savedUser.name,
          timezone: savedUser.timezone,
          online: false,
        }),
      });
    };
  }, [router]);

  const handleLogout = () => {
    if (user) {
      fetch("/api/chat/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          timezone: user.timezone,
          online: false,
        }),
      });
    }
    localStorage.removeItem("ff_user");
    router.push("/");
  };

  const createVideoRoom = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        // Send a chat message that you started a room
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: user.name,
            text: `📹 Hat einen Video-Raum erstellt: "${data.name}"`,
            timezone: user.timezone,
          }),
        });
        router.push(`/room/${data.name}`);
      }
    } catch {}
    setIsCreating(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-pink-100 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl flex items-center justify-center shadow-md shadow-pink-200">
              <span className="text-white font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Hallo, {user.name}! 👋
              </h1>
              <p className="text-sm text-gray-500">
                {getTimezoneLabel(user.timezone)}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* World map with day/night */}
        <WorldMap />

        {/* Online users */}
        <div className="bg-white border-2 border-pink-100 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <h2 className="font-semibold text-gray-700">Online</h2>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="text-gray-400 text-sm">Niemand ist online...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {onlineUsers.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm text-green-700"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main action cards */}
        <div className="grid gap-4 mb-4">
          {/* Chat Card */}
          <button
            onClick={() => router.push("/chat")}
            className="bg-white border-2 border-purple-100 rounded-2xl p-6 text-left hover:border-purple-300 hover:shadow-md hover:shadow-purple-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                <svg
                  className="w-7 h-7 text-white"
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
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  Chat & Zeiten planen
                </h2>
                <p className="text-gray-500 text-sm">
                  Schnacken und gemeinsame Zeiten finden – mit Zeitumrechnung!
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-300 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>

          {/* Video Call Card */}
          <div className="bg-white border-2 border-pink-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center shadow-sm">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  Video-Meeting
                </h2>
                <p className="text-gray-500 text-sm">
                  Starte oder erstelle einen Video-Raum
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Raumname (optional)"
                className="flex-1 px-4 py-2.5 border-2 border-pink-100 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-300 bg-pink-50/50 text-gray-800 placeholder-gray-400 transition-all text-sm"
                onKeyDown={(e) => e.key === "Enter" && createVideoRoom()}
              />
              <button
                onClick={createVideoRoom}
                disabled={isCreating}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-sm shadow-pink-200/50 flex items-center gap-2 text-sm"
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Los geht's!"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}