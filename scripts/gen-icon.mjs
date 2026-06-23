// Generates the Friends & Family app icon from the same dotted land mask the
// world map uses, so the icon stays pixel-consistent with the in-app map.
// Output: src/app/icon.svg (favicon) + PNGs for apple-touch + PWA install.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// ── 1. Pull the land mask straight out of worldmap.tsx ──
const wm = readFileSync(path.join(root, "src/app/lib/worldmap.tsx"), "utf8");
const b64 = wm.match(/LAND_MASK_B64\s*=\s*\n?\s*"([^"]+)"/)[1];
const GRID_COLS = 168;
const GRID_ROWS = 78;
const bytes = Buffer.from(b64, "base64");
const isLand = (row, col) => {
  const idx = row * GRID_COLS + col;
  return (bytes[idx >> 3] & (1 << (idx & 7))) !== 0;
};

// ── 2. Crop to the populated landmass rows/cols so the map fills the icon ──
let minR = GRID_ROWS, maxR = 0, minC = GRID_COLS, maxC = 0;
for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    if (!isLand(r, c)) continue;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
}

// ── 3. Build the SVG ──
const SIZE = 512;
const R = 112; // rounded-square corner radius
const PAD = 70; // inner padding so the map breathes inside the frame
const STROKE = 10;

const usedCols = maxC - minC + 1;
const usedRows = maxR - minR + 1;
const cell = Math.min((SIZE - 2 * PAD) / usedCols, (SIZE - 2 * PAD) / usedRows);
const dot = cell * 0.62; // square dot size (matches the reference image)
const mapW = usedCols * cell;
const mapH = usedRows * cell;
const offX = (SIZE - mapW) / 2;
const offY = (SIZE - mapH) / 2;

// Horizontal gradient stops: orange → red → magenta → violet → blue
const GRAD = [
  [0.0, "#f59e0b"],
  [0.22, "#f5503e"],
  [0.45, "#e11d74"],
  [0.62, "#c026d3"],
  [0.8, "#7c3aed"],
  [1.0, "#4f46e5"],
];
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function colorAt(t) {
  for (let i = 1; i < GRAD.length; i++) {
    if (t <= GRAD[i][0]) {
      const [t0, c0] = GRAD[i - 1];
      const [t1, c1] = GRAD[i];
      const f = (t - t0) / (t1 - t0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      return `rgb(${lerp(a[0], b[0], f)},${lerp(a[1], b[1], f)},${lerp(a[2], b[2], f)})`;
    }
  }
  return GRAD[GRAD.length - 1][1];
}

let rects = "";
for (let r = minR; r <= maxR; r++) {
  for (let c = minC; c <= maxC; c++) {
    if (!isLand(r, c)) continue;
    const x = offX + (c - minC) * cell + (cell - dot) / 2;
    const y = offY + (r - minR) * cell + (cell - dot) / 2;
    const t = usedCols > 1 ? (c - minC) / (usedCols - 1) : 0;
    rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${dot.toFixed(
      1
    )}" height="${dot.toFixed(1)}" rx="${(dot * 0.18).toFixed(1)}" fill="${colorAt(t)}"/>`;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f59e0b"/>
      <stop offset="0.5" stop-color="#d6219b"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect x="${STROKE / 2}" y="${STROKE / 2}" width="${SIZE - STROKE}" height="${
  SIZE - STROKE
}" rx="${R}" ry="${R}" fill="#ffffff" stroke="url(#frame)" stroke-width="${STROKE}"/>
  ${rects}
</svg>`;

writeFileSync(path.join(root, "src/app/icon.svg"), svg);
console.log("wrote src/app/icon.svg");

// ── 4. Rasterize PNGs (apple-touch + PWA install icons) ──
let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.warn("⚠ sharp unavailable — skipping PNG rasterization (SVG icon still written).");
}
if (sharp) {
  const targets = [
    ["src/app/apple-icon.png", 180],
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
  ];
  for (const [out, size] of targets) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(root, out));
    console.log("wrote", out, `(${size}px)`);
  }
}
