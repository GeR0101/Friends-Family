# Zentriertes Panther-Logo austauschen

## Anforderung

Das neue, zentrierte Panther-Kopf-Bild soll überall dort eingesetzt werden, wo das unsymmetrische Logo angezeigt wird.

## Betroffene Dateien und Stellen

### 1. Favicon und App Icons (für Home Screen)
| Datei | Beschreibung |
|-------|-------------|
| `public/favicon.png` | Browser-Tab Icon |
| `public/apple-touch-icon.png` | iOS Home Screen Icon |
| `public/icon-192.png` | Android/PWA Icon (192x192) |
| `public/icon-512.png` | Android/PWA Icon (512x512) |
| `public/icon.png` | Fallback Icon |

**Aktion:** Das hochgeladene zentrierte Bild als diese Dateien speichern/ersetzen.

### 2. Hauptlogo auf der Startseite
| Datei | Zeile | Verwendung |
|-------|-------|------------|
| `src/app/page.tsx` | 55 | `/one-carbo-logo.png` - Großes Logo auf Landing Page |

**Aktion:** `public/one-carbo-logo.png` mit dem neuen zentrierten Bild ersetzen.

### 3. Meeting-Raum Logos
| Datei | Zeile | Verwendung |
|-------|-------|------------|
| `src/app/room/[name]/page.tsx` | 133 | "Meeting beendet" Seite |
| `src/app/room/[name]/page.tsx` | 193 | Footer im Meeting (schwarze Version) |
| `src/app/room/[name]/page.tsx` | 248 | Loading-Screen beim Verbinden |

**Aktion:** 
- `public/one-carbo-logo.png` ersetzen (für Zeile 133 und 248)
- `public/one-carbo-logo-black.png` mit zentrierter schwarzer Version ersetzen (für Zeile 193)

## Implementierungsschritte

1. **Hochgeladenes Bild herunterladen** und speichern als:
   - `public/one-carbo-logo.png` (Hauptlogo)
   - `public/favicon.png` (Browser Tab)
   - `public/apple-touch-icon.png` (iOS)
   - `public/icon-192.png` (Android)
   - `public/icon-512.png` (Android)
   - `public/icon.png` (Fallback)

2. **Schwarze Version erstellen** (falls benötigt):
   - `public/one-carbo-logo-black.png` für den Meeting-Footer

## Hinweis

Kein Code muss geändert werden - nur die Bilddateien in `/public/` müssen ersetzt werden.
