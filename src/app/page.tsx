"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Auto-redirect if already set up
  useEffect(() => {
    const parentDevice = localStorage.getItem("parent-device");
    if (parentDevice) {
      router.replace("/parent");
      return;
    }
    // Check if any kid device exists
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("kid-device-")) {
        const data = JSON.parse(localStorage.getItem(key)!);
        const familyId = key.replace("kid-device-", "");
        if (data?.id) {
          router.replace(`/kid/${familyId}`);
          return;
        }
      }
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-white/50">Laden...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div>
          <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-3xl flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">FamilyCall</h1>
          <p className="text-white/50 mt-2">
            Ein Knopf. Ein Anruf. So einfach.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Kind drückt den Knopf</p>
              <p className="text-white/40 text-xs">Ein einziger grosser Button</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Eltern werden benachrichtigt</p>
              <p className="text-white/40 text-xs">Push-Notification aufs Handy</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Video-Anruf startet</p>
              <p className="text-white/40 text-xs">Direkt im Browser, keine App nötig</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/setup")}
          className="w-full py-4 px-4 bg-green-600/80 hover:bg-green-500/90 text-white font-semibold rounded-xl transition-all border border-green-500/30 text-lg"
        >
          Jetzt einrichten
        </button>

        <p className="text-white/20 text-xs">
          Funktioniert auf iPad, iPhone, Android &amp; Desktop
        </p>
      </div>
    </div>
  );
}
