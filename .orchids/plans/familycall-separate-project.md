# FamilyCall als eigenständiges Projekt deployen

## Aktuelles Problem
Das FamilyCall-Projekt wurde im selben Repository wie "One Carbo Video Meeting" entwickelt. Ein Deployment würde das bestehende One Carbo Projekt überschreiben. FamilyCall soll jedoch als **komplett neues, eigenständiges Projekt** existieren.

## Anforderungen
- FamilyCall soll ein eigenes Repository/Projekt haben
- One Carbo Video Meeting bleibt unverändert
- FamilyCall bekommt eine eigene Domain/URL
- Alle FamilyCall-spezifischen Dateien müssen migriert werden

## Betroffene Dateien (FamilyCall-spezifisch)

### Seiten
- `src/app/page.tsx` - FamilyCall Startseite
- `src/app/kid/[familyId]/page.tsx` - Kind-Gerät Ansicht
- `src/app/parent/page.tsx` - Eltern-Gerät Ansicht  
- `src/app/setup/page.tsx` - Setup-Wizard
- `src/app/room/[name]/page.tsx` - Video-Raum (falls FamilyCall-spezifisch)

### API Routes
- `src/app/api/families/route.ts` - Familien CRUD
- `src/app/api/devices/route.ts` - Geräte-Registrierung
- `src/app/api/calls/route.ts` - Anruf-Management
- `src/app/api/notifications/route.ts` - Push-Benachrichtigungen
- `src/app/api/rooms/route.ts` - Daily.co Raum-Verwaltung

### Libs/Utils
- `src/lib/supabase.ts` - Supabase Client
- `src/lib/firebase-admin.ts` - Firebase Admin SDK
- `src/lib/db.ts` - Datenbank-Verbindung (falls vorhanden)

### Konfiguration
- `.env.local` - Umgebungsvariablen (Daily.co, Supabase, Firebase)
- `public/firebase-messaging-sw.js` - Service Worker für Push
- `public/manifest.json` - PWA Manifest

## Implementierungsplan

### Phase 1: Neues Projekt in Orchids erstellen
1. **Neues Orchids-Projekt starten**
   - In Orchids Dashboard → "New Project" klicken
   - Next.js Template auswählen
   - Name: "FamilyCall" oder "family-call"

### Phase 2: Code migrieren
2. **Dateien ins neue Projekt kopieren**
   - Alle oben genannten FamilyCall-Dateien übertragen
   - `package.json` Dependencies anpassen (nur benötigte):
     - `@daily-co/daily-js`
     - `@daily-co/daily-react`
     - `firebase`
     - `firebase-admin`
     - `@supabase/supabase-js` (falls verwendet)
     - UI-Libraries (Radix, Lucide, etc.)

### Phase 3: Umgebungsvariablen einrichten
3. **Im neuen Projekt `.env.local` konfigurieren**
   ```
   DAILY_API_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY=...
   ```

### Phase 4: AGENTS.md aktualisieren
4. **Neue AGENTS.md für FamilyCall erstellen**
   ```markdown
   ## Project Summary
   FamilyCall - Eine einfache Video-Anruf App für Familien. 
   Großeltern können mit einem Knopfdruck ihre Enkel anrufen, 
   ohne komplizierte Apps oder Einstellungen.

   ## Tech Stack
   - Framework: Next.js (App Router)
   - Language: TypeScript
   - Styling: Tailwind CSS
   - Video API: Daily.co
   - Database: Supabase
   - Push Notifications: Firebase Cloud Messaging
   - Icons: Lucide React
   ```

### Phase 5: Deployment testen
5. **Neues Projekt deployen**
   - Build testen
   - Alle Funktionen verifizieren
   - Push-Notifications konfigurieren

## Alternative: Schnellere Methode

Falls du das aktuelle Projekt schnell als neues Projekt haben willst:

1. **One Carbo Dateien entfernen** (im aktuellen Repo)
   - Prüfen welche Dateien zu One Carbo gehören
   - Diese löschen oder archivieren
   
2. **AGENTS.md aktualisieren**
   - Auf FamilyCall-Beschreibung ändern

3. **Neues Git-Repository**
   - Orchids müsste ein neues Projekt erstellen
   - Den aktuellen Code dorthin pushen

## Empfehlung

**Empfohlene Variante: Neues Orchids-Projekt**

Das ist der sauberste Weg:
1. Erstelle ein neues Projekt in Orchids
2. Kopiere die FamilyCall-Dateien dorthin
3. One Carbo bleibt unberührt

Dies verhindert Konflikte und gibt dir zwei separate Deployments mit eigenen URLs.

## Nächste Schritte

1. Du musst in Orchids ein **neues Projekt** anlegen
2. Dann können wir den FamilyCall-Code dorthin kopieren
3. Die Umgebungsvariablen müssen im neuen Projekt eingerichtet werden
