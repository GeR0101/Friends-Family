"use client";

import Image from "next/image";

export default function DankePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-green-900/10 pointer-events-none" />

      <main className="relative w-full max-w-md bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl shadow-green-900/10 p-8 text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/one-carbo-logo.png"
            alt="One Carbo"
            width={100}
            height={100}
            priority
            className="rounded-xl"
          />
        </div>

        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Danke f&uuml;r deinen Besuch!
        </h1>
        <p className="text-[#A1A1AA] mb-2">
          Die Saunarunde wurde beendet.
        </p>
        <p className="text-[#777777] text-sm">
          Du kannst dieses Fenster jetzt schlie&szlig;en.
        </p>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#555555]">
            Powered by One Carbo
          </p>
        </div>
      </main>
    </div>
  );
}
