# Glassmorphism Design für One Carbo Meeting

## Requirements
Das One Carbo Video Meeting Tool soll ein modernes Glassmorphism-Design bekommen mit:
- Halbtransparenten, verschwommenen Hintergründen (Frosted Glass Effekt)
- Subtilen Rahmen mit Transparenz
- Schönen Hintergrund-Effekten (Gradient Blobs)
- Konsistentem Glas-Look auf allen Seiten

## Current State
- Startseite (`src/app/page.tsx`): Dunkler Hintergrund `#0A0A0A` mit soliden Karten `#141414`
- Meeting-Raum (`src/app/room/[name]/page.tsx`): Dunkler Hintergrund mit solidem Footer
- Akzentfarbe: Grün (`green-500`, `green-600`)

## Design Concept

### Glassmorphism Eigenschaften
1. **Background Blur**: `backdrop-blur-xl` (20px blur)
2. **Transparenz**: `bg-white/10` oder `bg-black/20` 
3. **Border**: `border border-white/20` für subtile Ränder
4. **Shadow**: Weiche Schatten für Tiefe

### Farbpalette
- Hintergrund: `#0A0A0A` (bleibt)
- Glas-Effekt: `rgba(255,255,255,0.05)` bis `rgba(255,255,255,0.1)`
- Border: `rgba(255,255,255,0.1)` bis `rgba(255,255,255,0.2)`
- Akzent: Grün bleibt (`#22C55E`)

### Hintergrund-Effekte
- Animierte oder statische Gradient-Blobs
- Grüne und blaue Akzente im Hintergrund
- Subtile Bewegung für lebendiges Gefühl

## Implementation Phases

### Phase 1: Startseite Glassmorphism
**Datei: `src/app/page.tsx`**

1. Hintergrund-Blobs hinzufügen:
```jsx
{/* Animated background blobs */}
<div className="absolute top-1/4 -left-20 w-72 h-72 bg-green-500/30 rounded-full blur-3xl" />
<div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-600/10 rounded-full blur-3xl" />
```

2. Haupt-Karte mit Glass-Effekt:
```jsx
<main className="relative w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8">
```

3. Input-Feld mit Glass-Effekt:
```jsx
<input className="w-full px-4 py-3 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30 text-white placeholder-white/30 transition-all" />
```

4. Info-Box mit Glass-Effekt:
```jsx
<div className="mt-8 p-4 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl">
```

5. Buttons anpassen:
- Primary: `bg-green-600/80 hover:bg-green-500/90 backdrop-blur-sm`
- Secondary: `bg-white/5 border border-white/10 hover:bg-white/10`

6. Divider "oder" anpassen:
```jsx
<span className="px-3 bg-transparent backdrop-blur-sm text-white/40">
```

### Phase 2: Meeting-Raum Footer
**Datei: `src/app/room/[name]/page.tsx`**

1. Footer mit Glass-Effekt:
```jsx
<div className="absolute bottom-0 left-0 right-0 z-10 p-3">
  <div className="flex items-center justify-between max-w-7xl mx-auto backdrop-blur-xl bg-white/10 border border-white/10 rounded-xl px-4 py-2">
```

2. Loading-Screen verbessern:
```jsx
<div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A] z-20">
  {/* Background blobs */}
  <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />
  <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl" />
  <div className="text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
```

3. Error-Screen mit Glass:
```jsx
<div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
```

### Phase 3: CSS Utilities (Optional)
**Datei: `src/app/globals.css`**

Wiederverwendbare Glass-Klassen:
```css
@layer components {
  .glass {
    @apply backdrop-blur-xl bg-white/5 border border-white/10;
  }
  .glass-card {
    @apply backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl;
  }
  .glass-input {
    @apply backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30;
  }
  .glass-button {
    @apply backdrop-blur-sm bg-white/10 border border-white/10 hover:bg-white/15 transition-all;
  }
}
```

## Visual Preview

```
┌─────────────────────────────────────┐
│  ○ ○ ○  (blurred green blob)        │
│     ┌─────────────────────┐         │
│     │  ░░░░░░░░░░░░░░░░░  │ ← glass │
│     │  [ONE CARBO LOGO]   │   card  │
│     │                     │         │
│     │  Video Meeting      │         │
│     │                     │         │
│     │  [░░░ Input ░░░░]   │ ← glass │
│     │                     │   input │
│     │  [████ Button ███]  │         │
│     │                     │         │
│     │  ░░░ Info Box ░░░░  │ ← glass │
│     └─────────────────────┘         │
│        ○ ○ (blurred blob)           │
└─────────────────────────────────────┘
```

## Critical Files for Implementation
- `src/app/page.tsx` - Hauptseite mit Glass-Karte und Inputs
- `src/app/room/[name]/page.tsx` - Meeting-Seite mit Glass-Footer und Loading
- `src/app/globals.css` - Optional: Wiederverwendbare Glass-Utilities

## Notes
- `backdrop-blur` funktioniert in allen modernen Browsern
- Transparenz sollte subtil sein (5-15%) für besten Effekt
- Grüne Blobs passen zum One Carbo Branding
- Hover-Effekte sollten sanft sein (transition-all)
