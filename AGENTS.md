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
