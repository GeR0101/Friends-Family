# Leave Meeting Verhalten nach Raumtyp

## Anforderung

Unterschiedliches Verhalten wenn jemand ein Meeting verlässt:

- **Sauna-Raum** (`/room/sauna`): Nach Verlassen → zurück zur Startseite (`/`)
- **Andere Räume** (z.B. `/room/partner-call`): Nach Verlassen → "Meeting beendet" Seite anzeigen (NICHT zur Startseite)

## Aktueller Stand

In `src/app/room/[name]/page.tsx` Zeile 68-69:
```typescript
frame.on("left-meeting", () => {
  router.push("/");
});
```

Aktuell werden ALLE Benutzer nach Verlassen zur Startseite weitergeleitet.

## Implementierungsplan

### Schritt 1: Raumname prüfen und Verhalten anpassen

In `src/app/room/[name]/page.tsx` den `left-meeting` Handler ändern:

```typescript
frame.on("left-meeting", () => {
  // Nur Sauna-Raum leitet zur Startseite weiter
  if (name.toLowerCase() === "sauna") {
    router.push("/");
  } else {
    // Andere Räume: "Meeting beendet" State anzeigen
    setMeetingEnded(true);
  }
});
```

### Schritt 2: Neuen State hinzufügen

```typescript
const [meetingEnded, setMeetingEnded] = useState(false);
```

### Schritt 3: "Meeting beendet" UI erstellen

Für Nicht-Sauna-Räume eine einfache Endseite anzeigen:

```tsx
if (meetingEnded) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="text-center">
        <Image
          src="/one-carbo-logo.png"
          alt="One Carbo"
          width={80}
          height={80}
          className="mx-auto mb-6 rounded-xl"
        />
        <h2 className="text-xl font-semibold text-white mb-2">
          Meeting beendet
        </h2>
        <p className="text-[#A1A1AA] mb-6">
          Danke für deine Teilnahme!
        </p>
        <p className="text-[#555555] text-sm">
          Du kannst diesen Tab jetzt schließen.
        </p>
      </div>
    </div>
  );
}
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/app/room/[name]/page.tsx` | `left-meeting` Handler anpassen, neuen State + UI hinzufügen |

## Zusammenfassung

- Sauna-Besucher → Startseite (können neuen Raum erstellen)
- Link-Empfänger → "Meeting beendet" Seite (Tab schließen)
