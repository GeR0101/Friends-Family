## Project Summary
FamilyCall - Eine einfache Video-Anruf App für Familien. Großeltern/Kinder können mit einem Knopfdruck ihre Eltern anrufen, ohne komplizierte Apps oder Einstellungen. PWA-fähig, läuft direkt im Browser.

## Tech Stack
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Video API: Daily.co (@daily-co/daily-js, @daily-co/daily-react)
- Database: Supabase (PostgreSQL)
- Push Notifications: Firebase Cloud Messaging (FCM)
- Icons: Lucide React

## Architecture
- `src/app/page.tsx`: Startseite mit Auto-Redirect (prüft localStorage ob Gerät bereits eingerichtet)
- `src/app/setup/page.tsx`: Setup-Wizard zum Erstellen einer Familie und Pairen von Geräten
- `src/app/kid/[familyId]/page.tsx`: Kind-Gerät - großer Anruf-Button
- `src/app/parent/page.tsx`: Eltern-Gerät - empfängt Anrufe, Push-Notifications
- `src/app/room/[name]/page.tsx`: Video-Raum mit Daily.co Prebuilt Iframe
- `src/app/api/family/`: Familie erstellen, Geräte pairen
- `src/app/api/call/`: Anruf starten, annehmen, ablehnen, Status
- `src/app/api/push/`: Push-Notification Token registrieren, Notifications senden
- `src/app/api/rooms/route.ts`: Daily.co Raum erstellen/abrufen
- `src/lib/db/`: Supabase Datenbank-Schema und Client (Tabellen: families, devices, calls)
- `src/lib/firebase/`: Firebase Admin SDK und Client SDK

## User Preferences
- Sprache: Deutsch
- Theme: Dark Mode (bg-[#0A0A0A])
- Einfachheit: So wenige Schritte wie möglich, große Buttons, keine Registrierung nötig

## Project Guidelines
- Geräte-Identifikation über localStorage (kein Login erforderlich)
- Kind-Gerät hat nur einen großen Anruf-Button
- Eltern-Gerät empfängt Push-Notifications und kann Anrufe annehmen/ablehnen
- Daily.co Räume sind "public" (kein Token nötig)
- PWA mit manifest.json und Service Worker für Push-Notifications

## Common Patterns
- API-Routen nutzen Supabase für Persistenz (families, devices, calls Tabellen)
- Firebase Admin SDK sendet Push-Notifications an registrierte Geräte
- localStorage speichert Geräte-Info (parent-device, kid-device-{familyId})
- Anruf-Flow: Kind drückt Button → API erstellt Call → Push an Eltern → Eltern nehmen an → Beide im Daily.co Raum
