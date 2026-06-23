// Timezone helpers that work with any IANA zone (e.g. "Europe/Vienna",
// "Asia/Makassar", "America/New_York") — no fixed set of locations.

export function getTimeInTimezone(iana: string): string {
  return new Date().toLocaleTimeString("de-DE", {
    timeZone: iana,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type TimeOfDay = {
  emoji: string;
  label: string;
};

function hourNow(iana: string): number {
  return parseInt(
    new Date().toLocaleTimeString("de-DE", {
      timeZone: iana,
      hour: "2-digit",
      hour12: false,
    }),
    10
  ) % 24;
}

export function getTimeOfDay(iana: string): TimeOfDay {
  const h = hourNow(iana);
  if (h >= 6 && h < 12) return { emoji: "🌅", label: "Morgen" };
  if (h >= 12 && h < 14) return { emoji: "☀️", label: "Mittag" };
  if (h >= 14 && h < 18) return { emoji: "⛅", label: "Nachmittag" };
  if (h >= 18 && h < 21) return { emoji: "🌆", label: "Abend" };
  return { emoji: "🌙", label: "Nacht" };
}

export function getOffsetMinutes(iana: string): number {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: iana,
    timeZoneName: "longOffset",
  }).formatToParts(new Date());
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "";
  const match = tzPart.match(/([+-]\d{1,2}):?(\d{2})?/);
  if (match) {
    const h = parseInt(match[1]);
    const m = parseInt(match[2] || "0");
    return h * 60 + (h < 0 ? -m : m);
  }
  return 0;
}

/** Convert a "HH:MM" time string from one IANA zone to another (today's offsets). */
export function convertTimeString(
  timeStr: string,
  fromIana: string,
  toIana: string
): string {
  const [hStr, mStr = "00"] = timeStr.split(":");
  const hours = parseInt(hStr);
  const minutes = parseInt(mStr);

  const fromOffset = getOffsetMinutes(fromIana);
  const toOffset = getOffsetMinutes(toIana);

  const totalMinutes = hours * 60 + minutes;
  const utcMinutes = totalMinutes - fromOffset;
  const targetMinutes = (((utcMinutes + toOffset) % 1440) + 1440) % 1440;

  const targetH = Math.floor(targetMinutes / 60);
  const targetM = Math.round(targetMinutes % 60);

  return `${String(targetH).padStart(2, "0")}:${String(targetM).padStart(2, "0")}`;
}

/** Absolute epoch (ms, UTC) for a wall-clock "YYYY-MM-DDTHH:MM" in a given zone. */
export function zonedToEpoch(timeStr: string, iana: string): number {
  const [datePart, timePart] = timeStr.split("T");
  if (!datePart || !timePart) return NaN;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: iana,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return guess - (asUTC - guess);
}

/** Local hour (0–23) of an absolute instant in a given zone. */
export function hourAtEpoch(epoch: number, iana: string): number {
  if (!Number.isFinite(epoch)) return NaN;
  return (
    parseInt(
      new Date(epoch).toLocaleTimeString("de-DE", {
        timeZone: iana,
        hour: "2-digit",
        hour12: false,
      }),
      10
    ) % 24
  );
}

/** "HH:MM" of an absolute instant in a given zone. */
export function timeAtEpoch(epoch: number, iana: string): string {
  if (!Number.isFinite(epoch)) return "--:--";
  return new Date(epoch).toLocaleTimeString("de-DE", {
    timeZone: iana,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Reasonable waking window: 07:00–22:59. */
export function isAwakeHour(hour: number): boolean {
  return hour >= 7 && hour < 23;
}

/** A short, friendly hint about what someone is likely doing at a local hour. */
export function dayPartHint(hour: number): string {
  if (hour >= 23 || hour < 6) return "schläft wahrscheinlich 😴";
  if (hour >= 6 && hour < 8) return "gerade Morgenroutine 🥐";
  if (hour >= 8 && hour < 15) return "vielleicht Schule/Arbeit 📚";
  if (hour >= 22) return "macht sich bettfertig 🌙";
  return "wahrscheinlich wach 🙂";
}

/** Findet Zeitangaben wie "14:00", "9:30", "1500", "15.00", "14 Uhr", "3pm" im Text */
export function findTimeInText(text: string): string | null {
  if (!text) return null;
  const colonMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1]);
    const m = parseInt(colonMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  const uhrMatch = text.match(/(\d{1,2})\s*Uhr/i);
  if (uhrMatch) {
    const h = parseInt(uhrMatch[1]);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
  }
  const fourDigitMatch = text.match(/\b(\d{3,4})\b/);
  if (fourDigitMatch) {
    const num = fourDigitMatch[1];
    if (num.length === 4) {
      const h = parseInt(num.substring(0, 2));
      const m = parseInt(num.substring(2, 4));
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    } else if (num.length === 3) {
      const h = parseInt(num.substring(0, 1));
      const m = parseInt(num.substring(1, 3));
      if (h >= 0 && h <= 9 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }
  }
  const pmMatch = text.match(/(\d{1,2})\s*(pm|am)\b/i);
  if (pmMatch) {
    let h = parseInt(pmMatch[1]);
    const ampm = pmMatch[2].toLowerCase();
    if (h >= 1 && h <= 12) {
      if (ampm === "pm" && h !== 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:00`;
    }
  }
  return null;
}
