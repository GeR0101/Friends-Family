# FamilyCall MVP - One-Tap Video für Kinder & Eltern

## Anforderung

**Komplett neue App** basierend auf OneCarbo-Codebase zu **FamilyCall** - einer extrem einfachen Familien-Video-App:

- Kind klickt auf einen Button
- Eltern erhalten Push-Notification
- Video startet automatisch
- Voll PWA-fähig (iPad/iPhone installierbar)
- DSGVO-konform
- Minimal-UI

**MVP-Scope (Minimal):** Nur One-Button + Push + Video - keine Extras

---

## Bestehendes System (Analyse)

### Was vorhanden ist (wiederverwendbar):
| Komponente | Datei | Status |
|------------|-------|--------|
| Next.js App Router | `src/app/` | ✅ Vorhanden |
| Daily.co Integration | `src/app/room/[name]/page.tsx` | ✅ Basis vorhanden |
| Room API | `src/app/api/rooms/route.ts` | ✅ Wiederverwendbar |
| PWA Manifest | `public/manifest.json` | ✅ Anpassen |
| Icons (192/512) | `public/icon-*.png` | ✅ Neue Icons nötig |
| Tailwind CSS | `src/app/globals.css` | ✅ Vorhanden |
| Radix UI Components | `package.json` | ✅ Vorhanden |

### Was fehlt (neu zu implementieren):
- Push-Notification System (Firebase FCM)
- Service Worker für Background Push
- Call State Machine
- Kinder-UI (One-Button)
- Eltern-UI (Push-Empfang)
- Datenbank für Pairing/Tokens (Vercel Postgres)
- JWT-basierte Sicherheit

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        FamilyCall                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │   Kind-UI    │         │  Eltern-UI   │                     │
│   │  /kid/[id]   │         │   /parent    │                     │
│   │              │         │              │                     │
│   │  [ANRUFEN]   │ ──────▶ │  Push + UI   │                     │
│   └──────────────┘         └──────────────┘                     │
│          │                        │                              │
│          ▼                        ▼                              │
│   ┌────────────────────────────────────────┐                    │
│   │           API Routes (Vercel)           │                    │
│   │  /api/call/request                      │                    │
│   │  /api/call/accept                       │                    │
│   │  /api/push/register                     │                    │
│   │  /api/rooms (bestehend)                 │                    │
│   └────────────────────────────────────────┘                    │
│          │                        │                              │
│          ▼                        ▼                              │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │   Vercel     │         │ Firebase FCM │                     │
│   │   Postgres   │         │   (Push)     │                     │
│   └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementierungsplan

### Phase 0: Firebase Projekt erstellen (MANUELL - vor Coding)

> **WICHTIG:** Diese Schritte müssen VOR der Implementierung manuell durchgeführt werden!

#### Schritt-für-Schritt Firebase Setup:

1. **Firebase Console öffnen:** https://console.firebase.google.com/
2. **Neues Projekt erstellen:**
   - Klick auf "Projekt hinzufügen"
   - Name: `familycall` (oder eigener Name)
   - Google Analytics: Optional (kann deaktiviert werden)
3. **Cloud Messaging aktivieren:**
   - Projekteinstellungen → Cloud Messaging Tab
   - "Web Push-Zertifikate" → "Schlüsselpaar generieren"
   - **VAPID Key kopieren** (öffentlicher Schlüssel)
4. **Web-App hinzufügen:**
   - Projektübersicht → "App hinzufügen" → Web (</> Icon)
   - App-Nickname: `FamilyCall Web`
   - Firebase SDK Config kopieren:
     ```javascript
     apiKey: "AIza...",
     authDomain: "familycall-xxx.firebaseapp.com",
     projectId: "familycall-xxx",
     storageBucket: "familycall-xxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc..."
     ```
5. **Service Account erstellen (für Server):**
   - Projekteinstellungen → Dienstkonten
   - "Neuen privaten Schlüssel generieren"
   - JSON-Datei sicher speichern

---

### Phase 1: Infrastruktur (Tag 1-2)

#### 1.1 Environment Variables konfigurieren
**Neue Datei: `.env.local`** (lokal) und Vercel Dashboard (production)

```env
# ═══════════════════════════════════════════════════════════════
# Firebase Client (öffentlich - NEXT_PUBLIC_)
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=familycall-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=familycall-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=familycall-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...
NEXT_PUBLIC_VAPID_KEY=BNx8...

# ═══════════════════════════════════════════════════════════════
# Firebase Admin (Server-seitig - GEHEIM!)
# ═══════════════════════════════════════════════════════════════
FIREBASE_PROJECT_ID=familycall-xxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@familycall-xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ═══════════════════════════════════════════════════════════════
# Daily.co (bestehend)
# ═══════════════════════════════════════════════════════════════
DAILY_API_KEY=xxx

# ═══════════════════════════════════════════════════════════════
# Vercel Postgres (automatisch nach Setup)
# ═══════════════════════════════════════════════════════════════
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NO_SSL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...

# ═══════════════════════════════════════════════════════════════
# App Config
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_APP_URL=https://familycall.vercel.app
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

#### 1.2 Vercel Postgres Setup
**Externe Schritte (manuell):**
1. Vercel Dashboard → Storage → Create Database → Postgres
2. Name: `familycall-db`
3. Region: `fra1` (Frankfurt - DSGVO!)
4. Connect to Project
5. Environment Variables werden automatisch hinzugefügt

### Phase 2: Datenbank Schema (Tag 2-3)

#### 2.1 Drizzle ORM Setup (bereits in package.json vorhanden)
**Neue Datei: `src/lib/db/schema.ts`**

```typescript
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════════════════════
// Familien - Eine Familie hat Eltern und Kinder
// ═══════════════════════════════════════════════════════════════
export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),                    // "Familie Müller"
  pairCode: text("pair_code").notNull().unique(),  // 6-stellig: "ABC123"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════
// Geräte - Jedes Gerät gehört zu einer Familie
// ═══════════════════════════════════════════════════════════════
export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").references(() => families.id).notNull(),
  role: text("role", { enum: ["kid", "parent"] }).notNull(),
  name: text("name").notNull(),                    // "Papas iPhone"
  pushToken: text("push_token"),                   // FCM Token
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════
// Anrufe - Call State Machine
// ═══════════════════════════════════════════════════════════════
export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").references(() => families.id).notNull(),
  kidDeviceId: uuid("kid_device_id").references(() => devices.id).notNull(),
  status: text("status", { 
    enum: ["REQUESTED", "NOTIFIED", "ACCEPTED", "IN_CALL", "TIMEOUT", "DECLINED", "ENDED"] 
  }).notNull().default("REQUESTED"),
  roomName: text("room_name").notNull(),
  roomUrl: text("room_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  endedAt: timestamp("ended_at"),
});

// Types für TypeScript
export type Family = typeof families.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type CallStatus = Call["status"];
```

#### 2.2 Database Connection
**Neue Datei: `src/lib/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

export const db = drizzle(sql, { schema });
export * from "./schema";
```

#### 2.3 Database Migration
**Neue Datei: `drizzle.config.ts`**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config;
```

**Befehle:**
```bash
npx drizzle-kit generate  # Generiert Migration
npx drizzle-kit push      # Wendet auf DB an
```

---

### Phase 3: Firebase Integration (Tag 3-4)

#### 3.1 Firebase Client Setup
**Neue Datei: `src/lib/firebase/client.ts`**

```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton App Instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Messaging mit Browser-Check
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  
  const { isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) {
    console.warn("Firebase Messaging nicht unterstützt");
    return null;
  }
  
  return getMessaging(app);
}

// Push Token holen
export async function requestPushToken(): Promise<string | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Push-Berechtigung nicht erteilt");
      return null;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error("Fehler beim Push-Token:", error);
    return null;
  }
}

// Foreground Messages
export function onForegroundMessage(callback: (payload: unknown) => void) {
  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      onMessage(messaging, callback);
    }
  });
}
```

#### 3.2 Firebase Service Worker
**Neue Datei: `public/firebase-messaging-sw.js`**

```javascript
// Service Worker für Background Push Notifications
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

// WICHTIG: Diese Werte müssen mit .env übereinstimmen!
// Bei Deployment: Vercel Build ersetzt diese NICHT automatisch
// Option 1: Hardcoden (einfach)
// Option 2: Build-Script das diese ersetzt
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",           // <-- Manuell eintragen!
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Background Message Handler
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background Message:", payload);
  
  const { title, body } = payload.notification || {};
  const data = payload.data || {};
  
  self.registration.showNotification(title || "Anruf!", {
    body: body || "Dein Kind möchte dich erreichen",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],  // Vibrationsmuster
    tag: "family-call",                   // Ersetzt alte Notification
    requireInteraction: true,             // Bleibt bis Interaktion
    data: {
      callId: data.callId,
      roomUrl: data.roomUrl,
      kidName: data.kidName,
    },
    actions: [
      { action: "accept", title: "Annehmen" },
      { action: "decline", title: "Ablehnen" }
    ]
  });
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const { callId, roomUrl } = event.notification.data || {};
  
  if (event.action === "accept" && roomUrl) {
    // Direkt zum Video-Room
    event.waitUntil(clients.openWindow(roomUrl));
  } else if (event.action === "decline" && callId) {
    // API Call zum Ablehnen
    event.waitUntil(
      fetch(`/api/call/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId }),
      })
    );
  } else {
    // Default: Eltern-Dashboard öffnen
    event.waitUntil(clients.openWindow("/parent"));
  }
});
```

#### 3.3 Firebase Admin (Server)
**Neue Datei: `src/lib/firebase/admin.ts`**

```typescript
import admin from "firebase-admin";

// Singleton Pattern für Firebase Admin
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// Push Notification senden
export async function sendPushNotification(
  token: string,
  options: {
    title: string;
    body: string;
    callId: string;
    roomUrl?: string;
    kidName?: string;
  }
): Promise<string> {
  const app = getFirebaseAdmin();
  
  return admin.messaging(app).send({
    token,
    notification: {
      title: options.title,
      body: options.body,
    },
    data: {
      callId: options.callId,
      roomUrl: options.roomUrl || "",
      kidName: options.kidName || "Dein Kind",
    },
    webpush: {
      fcmOptions: {
        link: options.roomUrl || "/parent",
      },
      notification: {
        requireInteraction: true,
      },
    },
    // Android-spezifisch
    android: {
      priority: "high",
      notification: {
        channelId: "family_calls",
        priority: "max",
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
  });
}

// Mehrere Tokens gleichzeitig
export async function sendPushToMultiple(
  tokens: string[],
  options: Parameters<typeof sendPushNotification>[1]
): Promise<{ successCount: number; failureCount: number }> {
  const app = getFirebaseAdmin();
  
  const response = await admin.messaging(app).sendEachForMulticast({
    tokens,
    notification: {
      title: options.title,
      body: options.body,
    },
    data: {
      callId: options.callId,
      roomUrl: options.roomUrl || "",
      kidName: options.kidName || "Dein Kind",
    },
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}
```

---

### Phase 4: API Routes (Tag 4-5)

#### 4.1 Push Token Registration
**Neue Datei: `src/app/api/push/register/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, devices } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { deviceId, token } = await req.json();

    if (!deviceId || !token) {
      return NextResponse.json(
        { error: "deviceId und token sind erforderlich" },
        { status: 400 }
      );
    }

    // Token aktualisieren
    await db
      .update(devices)
      .set({ 
        pushToken: token,
        lastSeen: new Date(),
        isOnline: true,
      })
      .where(eq(devices.id, deviceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push register error:", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}
```

#### 4.2 Call Request (Kind startet Anruf)
**Neue Datei: `src/app/api/call/request/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, devices, calls, families } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { sendPushToMultiple } from "@/lib/firebase/admin";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const { deviceId } = await req.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId ist erforderlich" },
        { status: 400 }
      );
    }

    // Kind-Device laden
    const kidDevice = await db.query.devices.findFirst({
      where: eq(devices.id, deviceId),
    });

    if (!kidDevice || kidDevice.role !== "kid") {
      return NextResponse.json(
        { error: "Ungültiges Gerät" },
        { status: 403 }
      );
    }

    // Eltern-Devices mit Push-Token laden
    const parentDevices = await db.query.devices.findMany({
      where: and(
        eq(devices.familyId, kidDevice.familyId),
        eq(devices.role, "parent")
      ),
    });

    const pushTokens = parentDevices
      .map((d) => d.pushToken)
      .filter((t): t is string => !!t);

    if (pushTokens.length === 0) {
      return NextResponse.json(
        { error: "Keine Eltern-Geräte mit Push registriert" },
        { status: 400 }
      );
    }

    // Room-Name generieren
    const roomName = `family-call-${nanoid(8)}`;

    // Call erstellen
    const [newCall] = await db
      .insert(calls)
      .values({
        familyId: kidDevice.familyId,
        kidDeviceId: deviceId,
        status: "REQUESTED",
        roomName,
      })
      .returning();

    // Push an alle Eltern senden
    const pushResult = await sendPushToMultiple(pushTokens, {
      title: "Anruf!",
      body: `${kidDevice.name} möchte dich erreichen`,
      callId: newCall.id,
      kidName: kidDevice.name,
    });

    // Status auf NOTIFIED setzen
    await db
      .update(calls)
      .set({ status: "NOTIFIED" })
      .where(eq(calls.id, newCall.id));

    return NextResponse.json({
      callId: newCall.id,
      roomName,
      pushSent: pushResult.successCount,
    });
  } catch (error) {
    console.error("Call request error:", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}
```

#### 4.3 Call Accept (Eltern nehmen an)
**Neue Datei: `src/app/api/call/accept/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, calls } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { callId } = await req.json();

    if (!callId) {
      return NextResponse.json(
        { error: "callId ist erforderlich" },
        { status: 400 }
      );
    }

    // Call laden
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      return NextResponse.json(
        { error: "Anruf nicht gefunden" },
        { status: 404 }
      );
    }

    if (call.status !== "NOTIFIED" && call.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Anruf kann nicht mehr angenommen werden" },
        { status: 400 }
      );
    }

    // Daily Room erstellen (bestehende API nutzen)
    const roomRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: call.roomName }),
    });

    const roomData = await roomRes.json();

    if (!roomRes.ok) {
      return NextResponse.json(
        { error: "Raum konnte nicht erstellt werden" },
        { status: 500 }
      );
    }

    // Call aktualisieren
    await db
      .update(calls)
      .set({
        status: "ACCEPTED",
        roomUrl: roomData.url,
        acceptedAt: new Date(),
      })
      .where(eq(calls.id, callId));

    return NextResponse.json({
      success: true,
      roomUrl: roomData.url,
      roomName: call.roomName,
    });
  } catch (error) {
    console.error("Call accept error:", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}
```

#### 4.4 Call Status (Polling für Kind)
**Neue Datei: `src/app/api/call/status/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, calls } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("callId");

  if (!callId) {
    return NextResponse.json(
      { error: "callId ist erforderlich" },
      { status: 400 }
    );
  }

  const call = await db.query.calls.findFirst({
    where: eq(calls.id, callId),
  });

  if (!call) {
    return NextResponse.json(
      { error: "Anruf nicht gefunden" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: call.status,
    roomUrl: call.roomUrl,
    roomName: call.roomName,
  });
}
```

#### 4.5 Family Pairing
**Neue Datei: `src/app/api/family/pair/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, families, devices } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { pairCode, deviceName, role } = await req.json();

    if (!pairCode || !deviceName || !role) {
      return NextResponse.json(
        { error: "pairCode, deviceName und role sind erforderlich" },
        { status: 400 }
      );
    }

    if (role !== "kid" && role !== "parent") {
      return NextResponse.json(
        { error: "role muss 'kid' oder 'parent' sein" },
        { status: 400 }
      );
    }

    // Familie finden
    const family = await db.query.families.findFirst({
      where: eq(families.pairCode, pairCode.toUpperCase()),
    });

    if (!family) {
      return NextResponse.json(
        { error: "Ungültiger Pairing-Code" },
        { status: 404 }
      );
    }

    // Neues Gerät erstellen
    const [newDevice] = await db
      .insert(devices)
      .values({
        familyId: family.id,
        name: deviceName,
        role,
      })
      .returning();

    return NextResponse.json({
      success: true,
      deviceId: newDevice.id,
      familyId: family.id,
      familyName: family.name,
    });
  } catch (error) {
    console.error("Pairing error:", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}
```

#### 4.6 Family Create
**Neue Datei: `src/app/api/family/create/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, families } from "@/lib/db";
import { nanoid } from "nanoid";

function generatePairCode(): string {
  // 6 Zeichen, nur Großbuchstaben und Zahlen (ohne verwechselbare: 0,O,I,1,L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Familienname ist erforderlich" },
        { status: 400 }
      );
    }

    const pairCode = generatePairCode();

    const [newFamily] = await db
      .insert(families)
      .values({
        name,
        pairCode,
      })
      .returning();

    return NextResponse.json({
      success: true,
      familyId: newFamily.id,
      pairCode: newFamily.pairCode,
    });
  } catch (error) {
    console.error("Family create error:", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}

---

### Phase 4: Kind-UI (Tag 8-10)

#### 4.1 Hauptseite
**Neue Datei: `src/app/kid/[familyId]/page.tsx`**

```tsx
"use client";

export default function KidPage({ params }) {
  const [status, setStatus] = useState<"idle" | "calling" | "connected">("idle");
  
  const startCall = async () => {
    setStatus("calling");
    const res = await fetch("/api/call/request", {
      method: "POST",
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });
    const { callId } = await res.json();
    
    // Poll for acceptance
    pollCallStatus(callId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex items-center justify-center">
      {status === "idle" && (
        <button 
          onClick={startCall}
          className="w-64 h-64 rounded-full bg-green-500 shadow-2xl flex items-center justify-center"
        >
          <span className="text-6xl">📞</span>
          <span className="text-2xl font-bold text-white mt-4">
            Mama & Papa anrufen
          </span>
        </button>
      )}
      
      {status === "calling" && (
        <div className="text-center text-white">
          <div className="animate-pulse text-8xl mb-8">📱</div>
          <p className="text-2xl">Rufe Mama & Papa...</p>
        </div>
      )}
    </div>
  );
}
```

**Design-Prinzipien:**
- Vollbild, keine Ablenkungen
- Ein großer, bunter Button
- Kinderfreundliche Farben (Blau, Lila, Grün)
- Große Emojis statt Text wo möglich
- Optional: Foto der Eltern auf dem Button

---

### Phase 5: Eltern-UI (Tag 10-12)

#### 5.1 Dashboard
**Neue Datei: `src/app/parent/page.tsx`**

Features:
- Eingehende Anrufe (mit Annehmen/Ablehnen)
- Push-Status (aktiviert/deaktiviert)
- DND-Modus (Do Not Disturb)
- Anruf-History
- Geräte-Verwaltung
- QR-Code für Kind-Pairing

#### 5.2 Incoming Call UI
**Neue Datei: `src/app/parent/call/[callId]/page.tsx`**

```tsx
// Wird geöffnet wenn Push geklickt wird
// Zeigt: "Max möchte dich anrufen"
// Buttons: Annehmen | Ablehnen
// Annehmen → Daily Room beitreten
```

---

### Phase 6: PWA & Service Worker (Tag 12-13)

#### 6.1 Manifest aktualisieren
**Datei: `public/manifest.json`**
```json
{
  "name": "FamilyCall",
  "short_name": "FamilyCall",
  "description": "One-Tap Video für die Familie",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#22C55E",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

#### 6.2 FCM Handler Component
**Neue Datei: `src/components/FCMHandler.tsx`**
```typescript
"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";

export default function FCMHandler({ deviceId }: { deviceId: string }) {
  useEffect(() => {
    const setup = async () => {
      const msg = await messaging();
      if (!msg) return;

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const token = await getToken(msg, {
        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        await fetch("/api/push/register", {
          method: "POST",
          body: JSON.stringify({ deviceId, token }),
        });
      }
    };

    setup();
  }, [deviceId]);

  return null;
}
```

---

### Phase 7: Sicherheit (Tag 13-14)

#### 7.1 JWT Pairing
- Familie erstellt 6-stelligen Pair-Code
- Kind-Gerät gibt Code ein → erhält JWT
- JWT wird in localStorage gespeichert
- Alle API-Calls validieren JWT

#### 7.2 Rate Limiting
```typescript
// middleware.ts - Rate Limiting für API
const rateLimit = {
  "/api/call/request": { windowMs: 60000, max: 5 },
  "/api/push/register": { windowMs: 60000, max: 3 },
};
```

#### 7.3 Device Binding
- Device-ID wird beim ersten Besuch generiert
- Token an Device-ID gebunden
- Verhindert Token-Diebstahl

---

## Neue Ordnerstruktur

```
src/
├── app/
│   ├── api/
│   │   ├── rooms/route.ts          # Bestehend (Daily)
│   │   ├── call/
│   │   │   ├── request/route.ts    # NEU: Anruf starten
│   │   │   ├── accept/route.ts     # NEU: Anruf annehmen
│   │   │   ├── decline/route.ts    # NEU: Anruf ablehnen
│   │   │   └── status/route.ts     # NEU: Status abfragen
│   │   ├── push/
│   │   │   └── register/route.ts   # NEU: Token registrieren
│   │   └── family/
│   │       ├── create/route.ts     # NEU: Familie erstellen
│   │       └── pair/route.ts       # NEU: Gerät pairen
│   ├── kid/
│   │   └── [familyId]/
│   │       └── page.tsx            # NEU: Kind-Oberfläche
│   ├── parent/
│   │   ├── page.tsx                # NEU: Eltern-Dashboard
│   │   └── call/
│   │       └── [callId]/page.tsx   # NEU: Eingehender Anruf
│   ├── room/[name]/page.tsx        # Bestehend (Daily Call)
│   ├── setup/
│   │   └── page.tsx                # NEU: Onboarding/Pairing
│   ├── page.tsx                    # Landing Page (anpassen)
│   └── layout.tsx                  # Bestehend
├── components/
│   ├── FCMHandler.tsx              # NEU: Push-Setup
│   └── CallButton.tsx              # NEU: Großer Anruf-Button
├── lib/
│   ├── firebase.ts                 # NEU: Firebase Client
│   ├── firebase-admin.ts           # NEU: Firebase Server
│   ├── kv.ts                       # NEU: Vercel KV Helpers
│   └── jwt.ts                      # NEU: JWT Handling
public/
├── firebase-messaging-sw.js        # NEU: Service Worker
├── manifest.json                   # Anpassen
└── icon-*.png                      # Neue Icons
```

---

## Neue Dependencies

```bash
npm install firebase firebase-admin @vercel/kv jose
```

| Package | Version | Zweck |
|---------|---------|-------|
| `firebase` | ^11.0.0 | Client SDK für Push |
| `firebase-admin` | ^13.0.0 | Server SDK für Sending |
| `@vercel/kv` | ^3.0.0 | Datenbank |
| `jose` | ^5.0.0 | JWT Handling |

---

## Qualitätskriterien

| Metrik | Ziel | Messung |
|--------|------|---------|
| Push-Latenz | <2s | Zeit von Button-Click bis Push-Ankunft |
| Clicks zum Call | <3 | Kind: 1, Eltern: 2 (Push + Annehmen) |
| Call Success Rate | 99% | Erfolgreiche Verbindungen |
| iOS Kompatibilität | ✅ | Safari PWA Push (iOS 16.4+) |

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| iOS Push-Einschränkungen | Mittel | PWA muss installiert sein für Push |
| Firebase Kosten | Niedrig | Free Tier: 10k/Monat ausreichend |
| Daily.co Limits | Niedrig | Free Tier: 2000 Min/Monat |
| Browser-Kompatibilität | Niedrig | Fallback: SMS (Phase 2) |

---

## Testplan

### Unit Tests
- [ ] JWT Generierung/Validierung
- [ ] Call State Machine Transitions
- [ ] Rate Limiting Logic

### Integration Tests
- [ ] Push-Notification Delivery
- [ ] Daily Room Creation
- [ ] KV Read/Write

### E2E Tests
- [ ] Kompletter Call-Flow (Kind → Eltern → Video)
- [ ] Pairing-Prozess
- [ ] PWA Installation

---

## Rollout-Plan

### Woche 1: Infrastruktur
- [ ] Firebase Projekt erstellen
- [ ] Vercel KV einrichten
- [ ] Environment Variables konfigurieren
- [ ] Firebase Client/Server Integration

### Woche 2: Core Features
- [ ] API Routes implementieren
- [ ] Kind-UI bauen
- [ ] Eltern-Dashboard bauen
- [ ] Push-Notifications testen

### Woche 3: Polish & Launch
- [ ] Pairing-Flow optimieren
- [ ] Error Handling verbessern
- [ ] Performance-Tests
- [ ] Beta-Release an Familie

---

## Phase 2 Features (Optional)

- **Multi-Eltern**: Mehrere Eltern pro Familie
- **Backup-Contacts**: Oma/Opa als Fallback
- **Time Windows**: "Nicht vor 7 Uhr"
- **SMS-Fallback**: Wenn Push nicht ankommt
- **Offline-Mode**: Nachricht wenn offline
- **Call-Recording**: Voicemails

---

## Zusammenfassung

| Was | Aufwand | Priorität |
|-----|---------|-----------|
| Firebase Setup | 2h (manuell) | P0 |
| Push-Integration | 1 Tag | P0 |
| Kind-UI | 1 Tag | P0 |
| Eltern-Dashboard | 2 Tage | P0 |
| Pairing-Flow | 1 Tag | P0 |
| JWT Security | 0.5 Tage | P1 |
| Rate Limiting | 0.5 Tage | P1 |
| Tests | 2 Tage | P1 |

**Geschätzter MVP-Aufwand: 10-14 Tage**
