# FamilyCall MVP - One-Tap Video für Kinder & Eltern

## Anforderung

Refaktorierung des bestehenden OneCarbo Video-Meeting-Systems zu **FamilyCall** - einer extrem einfachen Familien-Video-App:

- Kind klickt auf einen Button
- Eltern erhalten Push-Notification
- Video startet automatisch
- Voll PWA-fähig (iPad/iPhone installierbar)
- DSGVO-konform
- Minimal-UI

## Bestehendes System (Analyse)

### Was vorhanden ist:
| Komponente | Datei | Status |
|------------|-------|--------|
| Next.js App Router | `src/app/` | ✅ Vorhanden |
| Daily.co Integration | `src/app/room/[name]/page.tsx` | ✅ Vorhanden |
| Room API | `src/app/api/rooms/route.ts` | ✅ Vorhanden |
| PWA Manifest | `public/manifest.json` | ✅ Vorhanden |
| Icons (192/512) | `public/icon-*.png` | ✅ Vorhanden |

### Was fehlt:
- Push-Notification System (Firebase FCM)
- Service Worker für Background Push
- Call State Machine
- Kinder-UI (One-Button)
- Eltern-Dashboard
- Datenbank für Pairing/Tokens
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
│   │  [📞 ANRUF] │ ──────▶ │  Push + UI   │                     │
│   └──────────────┘         └──────────────┘                     │
│          │                        │                              │
│          ▼                        ▼                              │
│   ┌────────────────────────────────────────┐                    │
│   │           API Routes (Vercel)           │                    │
│   │  /api/call/request                      │                    │
│   │  /api/call/accept                       │                    │
│   │  /api/push/register                     │                    │
│   │  /api/daily/room                        │                    │
│   └────────────────────────────────────────┘                    │
│          │                        │                              │
│          ▼                        ▼                              │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │  Vercel KV   │         │ Firebase FCM │                     │
│   │  (State DB)  │         │   (Push)     │                     │
│   └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementierungsplan

### Phase 1: Infrastruktur (Tag 1-3)

#### 1.1 Firebase Project Setup
**Externe Schritte (manuell):**
1. Firebase Console → Neues Projekt "FamilyCall"
2. Cloud Messaging aktivieren
3. Web-App hinzufügen
4. VAPID Keys generieren (Project Settings → Cloud Messaging → Web Push certificates)

**Environment Variables (.env.local):**
```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
NEXT_PUBLIC_VAPID_KEY=xxx

# Firebase Admin (Server)
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_PRIVATE_KEY=xxx

# Existing
DAILY_API_KEY=xxx
```

#### 1.2 Vercel KV Setup
**Externe Schritte (manuell):**
1. Vercel Dashboard → Storage → Create KV Database
2. Connect to Project

**Environment Variables (automatisch):**
```env
KV_URL=xxx
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx
KV_REST_API_READ_ONLY_TOKEN=xxx
```

---

### Phase 2: Firebase Integration (Tag 3-5)

#### 2.1 Firebase Client Setup
**Neue Datei: `src/lib/firebase.ts`**
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const messaging = async (): Promise<Messaging | null> => {
  if (typeof window === "undefined") return null;
  const { isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  return getMessaging(app);
};
```

#### 2.2 Service Worker
**Neue Datei: `public/firebase-messaging-sw.js`**
```javascript
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "HARDCODED_API_KEY", // Muss beim Build injiziert werden
  projectId: "familycall",
  messagingSenderId: "xxx",
  appId: "xxx",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, data } = payload.notification || {};
  
  self.registration.showNotification(title || "Anruf!", {
    body: body || "Dein Kind möchte dich erreichen",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: "family-call",
    data: data,
    actions: [
      { action: "accept", title: "Annehmen" },
      { action: "decline", title: "Ablehnen" }
    ]
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.action === "accept") {
    const roomUrl = event.notification.data?.roomUrl;
    event.waitUntil(
      clients.openWindow(roomUrl || "/parent")
    );
  }
});
```

#### 2.3 Firebase Admin (Server)
**Neue Datei: `src/lib/firebase-admin.ts`**
```typescript
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  return admin.messaging().send({
    token,
    notification: { title, body },
    data,
    webpush: {
      fcmOptions: { link: data?.roomUrl },
    },
  });
};
```

---

### Phase 3: Datenmodell & API (Tag 5-8)

#### 3.1 Datenmodell (Vercel KV)
```typescript
// Types
interface Family {
  id: string;           // UUID
  name: string;         // "Familie Müller"
  createdAt: number;
  pairCode: string;     // 6-stellig für Pairing
}

interface Device {
  id: string;           // UUID
  familyId: string;
  role: "kid" | "parent";
  name: string;         // "Papas iPhone"
  pushToken: string | null;
  lastSeen: number;
  createdAt: number;
}

interface Call {
  id: string;           // UUID
  familyId: string;
  kidDeviceId: string;
  status: CallStatus;
  roomName: string;
  roomUrl: string | null;
  createdAt: number;
  acceptedAt: number | null;
  endedAt: number | null;
}

type CallStatus = 
  | "REQUESTED"   // Kind hat Button gedrückt
  | "NOTIFIED"    // Push wurde gesendet
  | "ACCEPTED"    // Eltern haben angenommen
  | "IN_CALL"     // Video läuft
  | "TIMEOUT"     // Keine Antwort (30s)
  | "DECLINED"    // Eltern haben abgelehnt
  | "ENDED";      // Call beendet
```

#### 3.2 API Routes

**`src/app/api/push/register/route.ts`**
```typescript
// POST: Push-Token registrieren
// Body: { deviceId, token }
// → Speichert Token in Vercel KV
```

**`src/app/api/call/request/route.ts`**
```typescript
// POST: Kind startet Anruf
// Body: { deviceId }
// → Erstellt Call mit Status REQUESTED
// → Sendet Push an alle Eltern-Devices
// → Gibt callId zurück
```

**`src/app/api/call/accept/route.ts`**
```typescript
// POST: Eltern nehmen an
// Body: { callId, deviceId }
// → Erstellt Daily Room
// → Setzt Status auf ACCEPTED
// → Gibt roomUrl zurück
```

**`src/app/api/call/status/route.ts`**
```typescript
// GET: Call-Status abfragen
// Query: ?callId=xxx
// → Kind pollt hier für Updates
```

**`src/app/api/family/pair/route.ts`**
```typescript
// POST: Gerät mit Familie verbinden
// Body: { pairCode, deviceName, role }
// → Erstellt Device-Eintrag
```

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
