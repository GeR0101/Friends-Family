"use client";

import { useEffect, useRef, useState } from "react";
import { timezoneIana, timezoneDisplayName } from "./timezone";

// ── Simplified continent outlines as arrays of [lon, lat] polygons ──
const POLYGONS: [number, number][][] = [
  // North America
  [[-140,58],[-120,65],[-100,72],[-85,70],[-72,62],
   [-60,48],[-55,47],[-67,44],[-75,38],[-82,30],
   [-82,25],[-92,18],[-102,20],[-108,25],[-118,34],[-125,44],[-140,58]],
  // Central America
  [[-92,18],[-88,15],[-84,12],[-80,8],[-78,9],[-84,14],[-90,16],[-92,18]],
  // South America
  [[-80,10],[-65,12],[-50,5],[-38,-2],[-35,-10],
   [-38,-20],[-45,-25],[-55,-34],[-65,-48],[-70,-55],
   [-75,-48],[-73,-35],[-70,-18],[-78,-3],[-80,5],[-80,10]],
  // Greenland
  [[-55,60],[-22,72],[-18,78],[-25,83],[-50,83],[-55,75],[-55,60]],
  // Europe mainland
  [[-10,36],[-5,37],[-10,44],[-8,44],[-2,46],[5,44],
   [8,48],[12,46],[15,46],[20,40],[25,36],[28,38],
   [30,45],[28,55],[20,56],[12,57],[5,54],[-5,52],[-10,50],[-10,44],[-10,36]],
  // Asia mainland (large polygon)
  [[30,42],[40,43],[50,45],[60,45],[68,42],
   [78,30],[85,25],[90,22],[100,14],[105,2],[109,-2],[115,-8],
   [120,-8],[125,-5],[132,-3],[140,-6],[144,-8],[146,-5],
   [140,0],[128,2],[122,25],[120,30],[125,33],
   [130,34],[140,40],[148,52],[160,58],[170,62],[180,65],
   [180,73],[160,72],[140,72],[120,73],[100,73],[80,72],
   [68,73],[60,55],[55,52],[40,48],[30,42]],
  // India (fills gap)
  [[68,28],[72,18],[76,10],[78,8],[80,13],[85,22],[90,28],[88,22],[82,25],[68,28]],
  // Japan
  [[130,31],[135,34],[138,36],[141,41],[145,44],[140,46],[135,35],[130,31]],
  // UK
  [[-8,50],[-4,54],[2,53],[2,51],[-2,50],[-6,50],[-8,50]],
  // Scandinavia
  [[5,58],[10,57],[14,60],[18,68],[25,71],[32,70],[28,62],[18,56],[5,58]],
  // Australia
  [[115,-12],[130,-12],[143,-11],[153,-16],[152,-28],[150,-38],[140,-38],[130,-33],[116,-34],[114,-22],[115,-12]],
  // New Zealand
  [[168,-36],[178,-37],[179,-46],[168,-46],[166,-42],[168,-36]],
  // Madagascar
  [[44,-13],[50,-16],[50,-25],[44,-24],[44,-13]],
  // Iceland
  [[-24,64],[-15,66],[-13,64],[-20,63],[-24,64]],
  // Sri Lanka
  [[80,6],[82,10],[80,10],[80,6]],
  // Philippines (rough)
  [[118,7],[125,6],[127,10],[122,18],[118,14],[118,7]],
  // Taiwan
  [[121,22],[122,25],[120,25],[121,22]],
  // Papua New Guinea
  [[141,-3],[148,-5],[155,-6],[150,-5],[142,-4],[141,-3]],
];

function pointInPoly(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (
      (poly[i][1] > py) !== (poly[j][1] > py) &&
      px < (poly[j][0] - poly[i][0]) * (py - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function isLand(lat: number, lon: number): boolean {
  return POLYGONS.some((poly) => pointInPoly(lon, lat, poly));
}

function getDayOfYear(d: Date): number {
  const start = new Date(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function getDaylight(latDeg: number, lonDeg: number, date: Date): number {
  const dayOfYear = getDayOfYear(date);
  const declRad =
    (23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81))) * Math.PI / 180;
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const subLonRad = (15 * (12 - utcHours)) * Math.PI / 180;

  const latRad = latDeg * Math.PI / 180;
  const lonRad = lonDeg * Math.PI / 180;

  const cosZenith =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(lonRad - subLonRad);

  return Math.max(0, Math.min(1, cosZenith));
}

const CITIES: { id: "austria" | "bali"; lat: number; lon: number; color: string }[] = [
  { id: "austria", lat: 47.5, lon: 14.55, color: "#fb923c" },
  { id: "bali", lat: -8.34, lon: 115.09, color: "#818cf8" },
];

const NIGHT_COLOR = { r: 50, g: 50, b: 72 };
const DAY_COLOR = { r: 230, g: 196, b: 130 };

export default function WorldMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [times, setTimes] = useState<Record<string, string>>({});

  // Update clocks every second
  useEffect(() => {
    const update = () => {
      const t: Record<string, string> = {};
      for (const city of CITIES) {
        t[city.id] = new Date().toLocaleTimeString("de-DE", {
          timeZone: timezoneIana[city.id],
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      setTimes(t);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Draw the dot-matrix map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const COLS = 120;
    const ROWS = 60;
    const DOT_R = 1.6;

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // Dark background
      ctx.fillStyle = "#0f0f1a";
      ctx.fillRect(0, 0, W, H);

      const date = new Date();

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const lat = 85 - (row / (ROWS - 1)) * 170;
          const lon = -180 + (col / (COLS - 1)) * 360;

          if (!isLand(lat, lon)) continue;

          const x = (col / (COLS - 1)) * W;
          const y = (row / (ROWS - 1)) * H;
          const day = getDaylight(lat, lon, date);

          const r = Math.round(NIGHT_COLOR.r + (DAY_COLOR.r - NIGHT_COLOR.r) * day);
          const g = Math.round(NIGHT_COLOR.g + (DAY_COLOR.g - NIGHT_COLOR.g) * day);
          const b = Math.round(NIGHT_COLOR.b + (DAY_COLOR.b - NIGHT_COLOR.b) * day);

          ctx.beginPath();
          ctx.arc(x, y, DOT_R, 0, 2 * Math.PI);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fill();
        }
      }

      // City markers
      for (const city of CITIES) {
        const cx = ((city.lon + 180) / 360) * W;
        const cy = ((85 - city.lat) / 170) * H;

        // Outer glow
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
        ctx.fillStyle = city.color + "22";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
        ctx.fillStyle = city.color + "44";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = city.color;
        ctx.fill();

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    render();
    const id = setInterval(render, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border-2 border-pink-100 bg-white p-4 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">Weltkarte – Tag & Nacht</h3>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#323250] inline-block border border-gray-300" />
            Nacht
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block border border-gray-300"
              style={{ backgroundColor: "#e6c482" }} />
            Tag
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} width={600} height={300} className="w-full rounded-xl" />

      {/* City labels with live times */}
      <div className="flex justify-between mt-3 gap-2">
        {CITIES.map((city) => (
          <div
            key={city.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-100"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: city.color }}
            />
            <span className="text-xs font-medium text-gray-700">
              {timezoneDisplayName[city.id]}
            </span>
            <span className="text-[11px] text-gray-400 tabular-nums">
              {times[city.id] || "--:--"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}