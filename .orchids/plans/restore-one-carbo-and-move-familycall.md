# One Carbo wiederherstellen & FamilyCall verschieben

## Ausgangslage
Das One Carbo Video Meeting Projekt wurde versehentlich mit FamilyCall-Code überschrieben. Der Original-Code ist jedoch noch in der Git-History vorhanden und kann wiederhergestellt werden.

## Strategie
1. **Dieses Projekt**: One Carbo Video Meeting wiederherstellen (aus Git History)
2. **Neues Projekt**: FamilyCall-Code in ein neues Orchids-Projekt verschieben

---

## Teil 1: FamilyCall in neues Projekt verschieben

### Schritt 1: Neues Orchids-Projekt erstellen
1. Gehe zu Orchids Dashboard
2. Klicke auf "New Project" → Next.js Template
3. Name: `family-call` oder `familycall`

### Schritt 2: FamilyCall-Code kopieren

**Diese Dateien müssen ins neue Projekt kopiert werden:**

#### Seiten (src/app/)
```
src/app/page.tsx                    # FamilyCall Startseite mit Auto-Redirect
src/app/layout.tsx                  # Layout (Metadata "FamilyCall" anpassen)
src/app/setup/page.tsx              # Setup-Wizard
src/app/kid/[familyId]/page.tsx     # Kind-Gerät Ansicht
src/app/parent/page.tsx             # Eltern-Gerät Ansicht
src/app/room/[name]/page.tsx        # Video-Raum (aktuelle Version)
```

#### API Routes (src/app/api/)
```
src/app/api/family/route.ts         # Familie erstellen, Geräte pairen
src/app/api/call/route.ts           # Anruf starten/Status
src/app/api/push/route.ts           # Push-Notifications registrieren/senden
src/app/api/rooms/route.ts          # Daily.co Raum-Verwaltung
```

#### Libs (src/lib/)
```
src/lib/db/schema.ts                # Drizzle Schema (families, devices, calls)
src/lib/db/index.ts                 # Drizzle Client
src/lib/firebase/admin.ts           # Firebase Admin SDK
src/lib/firebase/client.ts          # Firebase Client SDK
```

#### Public Assets
```
public/manifest.json                # PWA Manifest ("FamilyCall")
public/firebase-messaging-sw.js     # Service Worker für Push
public/favicon.ico                  # FamilyCall Favicon (neu erstellen)
```

#### Config
```
.env.local                          # Alle Umgebungsvariablen kopieren
AGENTS.md                           # FamilyCall AGENTS.md (bereits aktualisiert)
```

### Schritt 3: Dependencies im neuen Projekt

**package.json Dependencies hinzufügen:**
```json
{
  "dependencies": {
    "@daily-co/daily-js": "^0.74.0",
    "drizzle-orm": "^0.38.3",
    "firebase": "^11.1.0",
    "firebase-admin": "^13.0.2",
    "lucide-react": "^0.469.0",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.1"
  }
}
```

### Schritt 4: Umgebungsvariablen im neuen Projekt

```env
# Daily.co
DAILY_API_KEY=...

# Supabase/PostgreSQL
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...

# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

# Firebase (Admin)
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## Teil 2: One Carbo Video Meeting wiederherstellen

### Dateien aus Git History wiederherstellen

Der Original-Code ist in diesen Commits:

| Datei | Commit |
|-------|--------|
| `src/app/page.tsx` | `c6c78c3` |
| `src/app/room/[name]/page.tsx` | `bbbc8cf` |
| `src/app/layout.tsx` | `70da2c5` |
| `src/app/api/rooms/route.ts` | `20e4712` |
| `AGENTS.md` | `44af787` |
| `public/favicon.svg` | `ddfe5c5` |

### One Carbo page.tsx (Original)
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-green-900/10 pointer-events-none" />
      
      <main className="relative w-full max-w-md bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl shadow-green-900/10 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/one-carbo-logo.png"
              alt="One Carbo"
              width={120}
              height={120}
              priority
              className="rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            One Carbo Video Meeting
          </h1>
          <p className="text-[#A1A1AA]">
            Erstelle einen Raum oder tritt einem bei
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-[#A1A1AA] mb-2">
              Raumname (optional)
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="z.B. partner-call oder jour-fix"
              className="w-full px-4 py-3 border border-[#2A2A2A] rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-[#1A1A1A] text-white placeholder-[#555555] transition-all"
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={createRoom}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Neuen Raum erstellen
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2A]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#141414] text-[#555555]">oder</span>
            </div>
          </div>

          <button
            onClick={joinRoom}
            disabled={isLoading || !roomName.trim()}
            className="w-full py-3 px-4 border border-[#2A2A2A] hover:border-green-500/50 hover:bg-green-900/10 disabled:border-[#1A1A1A] disabled:text-[#444444] text-[#A1A1AA] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Bestehendem Raum beitreten
          </button>
        </div>

        <div className="mt-8 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <h3 className="font-medium text-white mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            So funktioniert&apos;s:
          </h3>
          <ol className="text-sm text-[#A1A1AA] space-y-1 list-decimal list-inside">
            <li>Gib einen Raumnamen ein (z.B. &quot;partner-call&quot;)</li>
            <li>Klicke auf &quot;Neuen Raum erstellen&quot;</li>
            <li>Teile den Link mit deinen Partnern</li>
            <li>Der Raum bleibt dauerhaft bestehen</li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#555555]">Powered by One Carbo</p>
        </div>
      </main>
    </div>
  );
}
```

### One Carbo AGENTS.md (Original)
```markdown
## Project Summary
Ein einfaches Video-Meeting-Tool basierend auf der Daily.co API. Benutzer können Räume erstellen, Links teilen und sich jederzeit wieder einwählen. Ideal für Jour Fixe oder regelmäßige Team-Meetings.

## Tech Stack
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Video API: Daily.co (@daily-co/daily-js)
- Icons: Heroicons, Lucide React

## Architecture
- `src/app/api/rooms/route.ts`: Serverless Route Handler zur Raumverwaltung über die Daily API.
- `src/app/page.tsx`: Startseite zur Erstellung oder zum Beitritt von Räumen.
- `src/app/room/[name]/page.tsx`: Meeting-Seite mit integriertem Daily Prebuilt Iframe.

## User Preferences
- Sprache: Deutsch
- Theme: Dark Mode Support (Gradient Backgrounds)
- Einfachheit: Fokus auf schnelles Erstellen und Teilen von Links

## Project Guidelines
- Räume werden standardmäßig als "public" erstellt, damit Freunde ohne Token beitreten können.
- Daily Prebuilt wird für die schnellste und stabilste UI-Integration verwendet.

## Common Patterns
- API-Routen prüfen erst die Existenz eines Raums, bevor sie einen neuen erstellen.
- Links werden über die Clipboard API geteilt.
```

### One Carbo layout.tsx Metadata
```tsx
export const metadata: Metadata = {
  title: "One Carbo Meeting",
  description: "Video-Meeting-Tool von One Carbo - Einfach Räume erstellen und mit Partnern verbinden",
  icons: {
    icon: "/favicon.svg",
  },
};
```

### One Carbo favicon.svg
```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#0A0A0A"/>
  <path d="M8 6C8 6 5 12 5 18C5 24 8 29 14 32C20 29 23 24 23 18C23 12 20 6 20 6C20 6 17 9 14 9C11 9 8 6 8 6Z" fill="#22C55E" transform="translate(2, -2)"/>
  <circle cx="13" cy="16" r="1.5" fill="#0A0A0A"/>
  <circle cx="16" cy="13" r="1.5" fill="#0A0A0A"/>
  <circle cx="19" cy="16" r="1.5" fill="#0A0A0A"/>
  <circle cx="16" cy="19" r="1.5" fill="#0A0A0A"/>
  <circle cx="16" cy="16" r="1.5" fill="#0A0A0A"/>
</svg>
```

---

## Zusammenfassung der Schritte

### Sofort (in diesem Projekt):
1. ✅ One Carbo Code ist in Git History gesichert
2. → One Carbo Dateien wiederherstellen (page.tsx, room page, layout, AGENTS.md)
3. → FamilyCall-spezifische Dateien entfernen (setup/, kid/, parent/, api/family, api/call, api/push, lib/db, lib/firebase)
4. → One Carbo Logos wiederherstellen (one-carbo-logo.png, favicon.svg)

### Danach (neues Projekt):
1. → Neues Orchids-Projekt "FamilyCall" erstellen
2. → FamilyCall-Code dorthin kopieren
3. → Umgebungsvariablen einrichten
4. → Deployen

---

## Git-Befehle zum Wiederherstellen

```bash
# One Carbo Dateien aus Git History holen
git show c6c78c3:src/app/page.tsx > src/app/page.tsx
git show bbbc8cf:src/app/room/[name]/page.tsx > src/app/room/[name]/page.tsx
git show 70da2c5:src/app/layout.tsx > src/app/layout.tsx
git show 44af787:AGENTS.md > AGENTS.md
git show ddfe5c5:public/favicon.svg > public/favicon.svg

# Logo-Dateien müssen neu hochgeladen werden (Binary)
# → one-carbo-logo.png, one-carbo-logo-white.png, etc.
```

## Nächste Aktion

**Bitte bestätige, ob ich:**
1. Zuerst One Carbo in diesem Projekt wiederherstellen soll
2. Oder ob du erst das neue FamilyCall-Projekt in Orchids erstellst

Ich würde empfehlen: Erst neues Projekt erstellen, dann hier One Carbo wiederherstellen.
