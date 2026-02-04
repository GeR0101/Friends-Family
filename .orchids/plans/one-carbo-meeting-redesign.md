# One Carbo Video Meeting - Redesign & Workflow

## Requirements

Überarbeitung des Video-Meeting-Tools für One Carbo (Biokohle-Unternehmen):
1. **Workflow-Analyse**: Klären, ob Login notwendig ist
2. **Optisches Redesign**: Dunkles Theme, One Carbo Branding, Logo
3. **Farbschema**: Schwarz/Dunkel mit Akzentfarben passend zu Biokohle

## Current State Analysis

### Aktueller Workflow
- Jeder kann Räume erstellen (über `/api/rooms`)
- Räume sind "public" - jeder mit Link kann beitreten
- Räume bleiben dauerhaft bestehen
- Daily API Key ist server-seitig gespeichert

### Login-Frage: Brauchen wir Authentifizierung?

**Szenario 1: Nur du (Host) nutzt das Tool**
- ❌ Kein Login nötig
- Du erstellst Räume, teilst Links mit Partnern/Kunden
- Partner treten einfach über den Link bei (keine Registrierung)
- **Empfehlung**: Aktueller Workflow ist perfekt!

**Szenario 2: Mehrere Personen sollen Räume erstellen können**
- ✅ Login wäre sinnvoll
- Schützt die Raum-Erstellung vor Missbrauch
- Gäste können weiterhin ohne Login beitreten
- **Umsetzung**: better-auth ist bereits im Projekt installiert

**Szenario 3: Öffentliches Tool für externe Nutzer**
- ✅ Login + evtl. Bezahlmodell
- Komplexere Umsetzung

### Empfohlener Workflow (Szenario 1 - Einfach)

```
[Du] → Öffnest one-carbo-meeting.com
      → Gibst Raumnamen ein (z.B. "partner-call")
      → Klickst "Raum erstellen"
      → Kopierst Link
      → Sendest Link an Partner/Kunden

[Partner] → Klickt auf Link
          → Landet direkt im Meeting (kein Login)
          → Kann Kamera/Mikro freigeben
```

## Design Concept

### Farbpalette (Biokohle-Theme)
- **Primär**: `#0A0A0A` (Tiefes Schwarz - Kohle)
- **Sekundär**: `#1A1A1A` (Dunkelgrau - Asche)
- **Akzent**: `#22C55E` (Grün - Nachhaltigkeit/Natur)
- **Akzent Alt**: `#84CC16` (Lime - Wachstum)
- **Text**: `#FAFAFA` (Weiß)
- **Text Muted**: `#A1A1AA` (Grau)

### Logo-Optionen
1. **Text-Logo**: "ONE CARBO" in modernem Font
2. **Icon + Text**: Stilisiertes Kohle/Blatt-Symbol + Text
3. **Upload**: Eigenes Logo hochladen (empfohlen)

### UI-Elemente
- Dunkler Hintergrund mit subtilen Gradienten
- Grüne Akzent-Buttons (Nachhaltigkeit)
- Abgerundete Karten mit leichtem Glow-Effekt
- Minimalistisches Design

## Implementation Phases

### Phase 1: Branding & Design (Priorität: Hoch)
- [ ] One Carbo Logo in `/public` hinzufügen
- [ ] Startseite mit dunklem Theme redesignen
- [ ] Farbschema auf Schwarz/Grün umstellen
- [ ] "One Carbo Meeting" Branding überall einbauen
- [ ] Meeting-Raum-Seite an neues Design anpassen

### Phase 2: UX-Verbesserungen
- [ ] Bessere Fehlermeldungen
- [ ] Loading-States optimieren
- [ ] Mobile-Responsive prüfen
- [ ] Favicon/App-Icon aktualisieren

### Phase 3: Optional - Authentifizierung (falls gewünscht)
- [ ] better-auth Setup für Login
- [ ] Nur eingeloggte User können Räume erstellen
- [ ] Gäste können weiterhin ohne Login beitreten
- [ ] Dashboard für erstellte Räume

## Technical Details

### Dateien für Design-Änderungen
- `src/app/page.tsx` - Startseite
- `src/app/room/[name]/page.tsx` - Meeting-Raum
- `src/app/layout.tsx` - Metadata & Globales Layout
- `src/app/globals.css` - CSS Variablen
- `public/` - Logo & Assets

### Vorhandene Ressourcen
- `better-auth` bereits installiert (für optionales Login)
- Tailwind CSS für Styling
- Lucide React für Icons

## Questions for User

1. **Logo**: Hast du ein One Carbo Logo als PNG/SVG? Falls ja, bitte hochladen.
2. **Login**: Soll nur du Räume erstellen können, oder auch andere Teammitglieder?
3. **Farben**: Ist Grün als Akzentfarbe okay, oder bevorzugst du eine andere?

## Critical Files for Implementation

- `src/app/page.tsx` - Hauptseite für Redesign
- `src/app/room/[name]/page.tsx` - Meeting-Raum Design
- `src/app/globals.css` - CSS Variablen für Farbschema
- `public/logo.svg` - Logo-Datei (muss hinzugefügt werden)
- `src/app/layout.tsx` - Metadata & Favicon
