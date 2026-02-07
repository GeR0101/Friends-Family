# One Carbo Video Meeting Wiederherstellen

## Gute Nachricht! 🎉

**Der One Carbo Code existiert noch in der Git-History!** Er wurde nicht gelöscht, nur überschrieben. Wir können ihn vollständig wiederherstellen.

## Gefundene Original-Dateien

Die folgenden One Carbo Dateien sind im Git-Verlauf verfügbar:

| Datei | Commit | Beschreibung |
|-------|--------|--------------|
| `src/app/page.tsx` | d224860 | Startseite mit Raum erstellen/beitreten |
| `src/app/room/[name]/page.tsx` | 08faf5e | Video-Meeting Raum (einfache Version) |
| `src/app/api/rooms/route.ts` | 2fe5dda | Daily.co API Route |
| `src/app/layout.tsx` | 18abac5 | Layout (Standard Next.js) |

## Das Problem

Dieses Projekt (ursprünglich One Carbo) wurde mit FamilyCall-Code überschrieben. Um beide Projekte getrennt zu haben, gibt es zwei Optionen:

---

## Option A: Neues Orchids-Projekt für FamilyCall (Empfohlen)

**Schritte:**
1. **In Orchids Dashboard:**
   - Erstelle ein neues Projekt "FamilyCall"
   - Wähle Next.js Template

2. **Hier One Carbo wiederherstellen:**
   ```bash
   # Diese Befehle stellen die Original-Dateien wieder her:
   git checkout d224860 -- src/app/page.tsx
   git checkout 08faf5e -- src/app/room/[name]/page.tsx
   git checkout 2fe5dda -- src/app/api/rooms/route.ts
   ```

3. **FamilyCall-spezifische Ordner löschen:**
   - `src/app/setup/`
   - `src/app/kid/`
   - `src/app/parent/`
   - `src/app/api/family/`
   - `src/app/api/call/`
   - `src/app/api/push/`
   - `src/lib/db/`
   - `src/lib/firebase/`

4. **AGENTS.md zurücksetzen** auf One Carbo Beschreibung

---

## Option B: One Carbo als neues Projekt

**Schritte:**
1. **In Orchids Dashboard:**
   - Erstelle ein neues Projekt "One Carbo Video Meeting"
   - Wähle Next.js Template

2. **Kopiere diese Dateien ins neue Projekt:**

### src/app/page.tsx (One Carbo Startseite)
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Erstellen des Raums");
        return;
      }

      router.push(`/room/${data.name}`);
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = () => {
    if (!roomName.trim()) {
      setError("Bitte gib einen Raumnamen ein");
      return;
    }
    router.push(`/room/${roomName.trim()}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <main className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Video Meeting</h1>
          <p className="text-gray-600 dark:text-gray-400">Erstelle einen Raum oder tritt einem bei</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Raumname (optional)
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="z.B. team-standup oder jour-fix"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={createRoom}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Wird erstellt...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuen Raum erstellen
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">oder</span>
            </div>
          </div>

          <button
            onClick={joinRoom}
            disabled={isLoading || !roomName.trim()}
            className="w-full py-3 px-4 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 disabled:border-gray-200 disabled:text-gray-400 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Bestehendem Raum beitreten
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">So funktioniert's:</h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Gib einen Raumnamen ein (z.B. "team-meeting")</li>
            <li>Klicke auf "Neuen Raum erstellen"</li>
            <li>Teile den Link mit deinen Freunden</li>
            <li>Der Raum bleibt dauerhaft bestehen</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
```

### src/app/api/rooms/route.ts
```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "DAILY_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const roomName = body.name || generateRoomName();

    // First check if room already exists
    const checkRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (checkRes.ok) {
      const existingRoom = await checkRes.json();
      return NextResponse.json({ url: existingRoom.url, name: existingRoom.name, created: false });
    }

    // Room doesn't exist, create it
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: {
          enable_prejoin_ui: true,
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Daily API error:", data);
      return NextResponse.json({ error: data.error || "Failed to create room" }, { status: res.status });
    }

    return NextResponse.json({ url: data.url, name: data.name, created: true });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateRoomName(): string {
  const adjectives = ["happy", "quick", "bright", "calm", "bold", "cool"];
  const nouns = ["meeting", "sync", "call", "chat", "huddle", "standup"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}
```

### Umgebungsvariable
```
DAILY_API_KEY=dein-daily-api-key
```

---

## Empfehlung

**Ich empfehle Option A** - One Carbo hier wiederherstellen und FamilyCall in einem neuen Projekt aufbauen. Das ist einfacher, weil:

1. One Carbo hat weniger Dateien (einfacher wiederherzustellen)
2. FamilyCall ist das neuere Projekt, das sowieso neu aufgebaut werden sollte
3. Die Vercel-URL bleibt für One Carbo erhalten

## Nächste Schritte

1. Entscheide welche Option du möchtest
2. Erstelle ggf. das neue Orchids-Projekt
3. Ich kann dann die Wiederherstellung durchführen

