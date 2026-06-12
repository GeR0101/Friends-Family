"use client";

export default function DankePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0] p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-pink-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <main className="relative w-full max-w-md bg-white border-2 border-pink-100 rounded-3xl shadow-lg shadow-pink-200/50 p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-300 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-green-200">
          <svg
            className="w-10 h-10 text-white"
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

        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Danke für deinen Besuch!
        </h1>
        <p className="text-gray-500 mb-2">
          Das Video-Meeting wurde beendet.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Bis zum nächsten Mal!
        </p>

        <a
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-pink-200/50"
        >
          Zurück zur Startseite
        </a>
      </main>
    </div>
  );
}