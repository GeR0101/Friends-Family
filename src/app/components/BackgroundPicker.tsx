"use client";

import { useEffect, useState } from "react";
import { CHAT_BACKGROUNDS, getChatBgId, setChatBgId } from "../lib/backgrounds";

// A modal grid to pick the chat wallpaper. Applies immediately on tap.
export default function BackgroundPicker({ onClose }: { onClose: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => setSel(getChatBgId()), []);

  const choose = (id: string | null) => {
    setSel(id);
    setChatBgId(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Chat-Hintergrund</h3>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Default (no wallpaper) */}
          <button type="button" onClick={() => choose(null)} className="group">
            <div
              className={`flex aspect-[9/16] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-orange-50 to-violet-50 ring-2 transition-all ${
                sel ? "ring-black/5" : "ring-violet-500"
              }`}
            >
              <span className="text-[11px] font-medium text-gray-400">Standard</span>
            </div>
            <span className="mt-1 block text-center text-xs text-gray-600">Kein</span>
          </button>

          {CHAT_BACKGROUNDS.map((b) => (
            <button key={b.id} type="button" onClick={() => choose(b.id)} className="group">
              <div
                className={`aspect-[9/16] overflow-hidden rounded-xl ring-2 transition-all ${
                  sel === b.id ? "ring-violet-500" : "ring-black/5"
                }`}
                style={{ backgroundColor: b.swatch }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <span className="mt-1 block truncate text-center text-xs text-gray-600">{b.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
