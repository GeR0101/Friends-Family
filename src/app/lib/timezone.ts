export type TimezoneId = "bali" | "austria";

export const timezoneIana: Record<TimezoneId, string> = {
  bali: "Asia/Makassar",
  austria: "Europe/Vienna",
};

export const timezoneDisplayName: Record<TimezoneId, string> = {
  bali: "Bali",
  austria: "Österreich",
};

export function getCurrentOffset(tz: TimezoneId): string {
  const iana = timezoneIana[tz];
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: iana,
    timeZoneName: "longOffset",
  });
  const parts = formatter.formatToParts(now);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
  return offset;
}

export function getTimezoneLabel(tz: TimezoneId): string {
  const offset = getCurrentOffset(tz);
  return `${timezoneDisplayName[tz]} (${offset})`;
}

export function getTimeInTimezone(tz: TimezoneId): string {
  return new Date().toLocaleTimeString("de-DE", {
    timeZone: timezoneIana[tz],
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type TimeOfDay = {
  emoji: string;
  label: string;
  bg: string; // inline style background
};

export function getTimeOfDay(tz: TimezoneId): TimeOfDay {
  const tzHour = parseInt(
    new Date().toLocaleTimeString("de-DE", {
      timeZone: timezoneIana[tz],
      hour: "2-digit",
      hour12: false,
    }),
    10
  );

  if (tzHour >= 6 && tzHour < 12) {
    return { emoji: "🌅", label: "Morgen", bg: "linear-gradient(135deg, #fbbf24, #fb923c)" };
  }
  if (tzHour >= 12 && tzHour < 14) {
    return { emoji: "☀️", label: "Mittag", bg: "linear-gradient(135deg, #fde047, #fb923c)" };
  }
  if (tzHour >= 14 && tzHour < 18) {
    return { emoji: "⛅", label: "Nachmittag", bg: "linear-gradient(135deg, #fed7aa, #fcd34d)" };
  }
  if (tzHour >= 18 && tzHour < 21) {
    return { emoji: "🌆", label: "Abend", bg: "linear-gradient(135deg, #a5b4fc, #c084fc)" };
  }
  return { emoji: "🌙", label: "Nacht", bg: "linear-gradient(135deg, #6366f1, #475569)" };
}

export function getOffsetMinutes(tz: TimezoneId): number {
  const iana = timezoneIana[tz];
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: iana,
    timeZoneName: "longOffset",
  });
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "";
  const match = tzPart.match(/([+-]\d{1,2}):?(\d{2})?/);
  if (match) {
    const h = parseInt(match[1]);
    const m = parseInt(match[2] || "0");
    return h * 60 + (h < 0 ? -m : m);
  }
  return 0;
}

/** Convert a "HH:MM" time string from one timezone to another */
export function convertTimeString(
  timeStr: string,
  fromTz: TimezoneId,
  toTz: TimezoneId
): string {
  const [hStr, mStr = "00"] = timeStr.split(":");
  const hours = parseInt(hStr);
  const minutes = parseInt(mStr);

  const fromOffset = getOffsetMinutes(fromTz);
  const toOffset = getOffsetMinutes(toTz);

  const totalMinutes = hours * 60 + minutes;
  const utcMinutes = totalMinutes - fromOffset;
  const targetMinutes = ((utcMinutes + toOffset) % 1440 + 1440) % 1440;

  const targetH = Math.floor(targetMinutes / 60);
  const targetM = Math.round(targetMinutes % 60);

  return `${String(targetH).padStart(2, "0")}:${String(targetM).padStart(2, "0")}`;
}

export type OverlapInfo = {
  austria: string;
  bali: string;
  duration: string;
};

/** Berechnet die gemeinsamen Wachstunden (8:00–22:00) zwischen Bali und Österreich */
export function getOverlapHours(): OverlapInfo | null {
  const diff = getOffsetMinutes("bali") - getOffsetMinutes("austria");

  const awakeStart = 8 * 60; // 8:00
  const awakeEnd = 22 * 60;  // 22:00

  // Bali-Wachzeit in Österreich-Zeit
  const baliAwakeStartAustria = awakeStart - diff;
  const baliAwakeEndAustria = awakeEnd - diff;

  const overlapStart = Math.max(awakeStart, baliAwakeStartAustria);
  const overlapEnd = Math.min(awakeEnd, baliAwakeEndAustria);

  if (overlapStart >= overlapEnd) return null;

  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };

  const duration = Math.round((overlapEnd - overlapStart) / 60);
  const baliOverlapStart = overlapStart + diff;
  const baliOverlapEnd = overlapEnd + diff;

  return {
    austria: `${fmt(overlapStart)}–${fmt(overlapEnd)}`,
    bali: `${fmt(baliOverlapStart)}–${fmt(baliOverlapEnd)}`,
    duration: `${duration} Std.`,
  };
}

/** Findet Zeitangaben wie "14:00", "9:30", "1500", "15.00", "14 Uhr", "3pm" im Text */
export function findTimeInText(text: string): string | null {
  if (!text) return null;
  // Match "14:00" or "9:30"
  const colonMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1]);
    const m = parseInt(colonMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  // Match "14 Uhr" or "14Uhr"
  const uhrMatch = text.match(/(\d{1,2})\s*Uhr/i);
  if (uhrMatch) {
    const h = parseInt(uhrMatch[1]);
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, "0")}:00`;
    }
  }
  // Match "1500" (4 digits that look like a time)
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
  // Match "3pm" or "3 pm"
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

/** Prüft ob eine Zeit (HH:MM) in der gemeinsamen Wachzeit liegt */
export function isTimeInOverlap(timeStr: string, tz: TimezoneId): boolean {
  const overlap = getOverlapHours();
  if (!overlap) return true; // wenn kein overlap berechnet werden kann, optimistisch

  const [h, m] = timeStr.split(":").map(Number);
  const totalMinutes = h * 60 + m;

  const range = tz === "bali" ? overlap.bali : overlap.austria;
  const parts = range.split("–");
  if (parts.length !== 2) return true;

  const [startH, startM] = parts[0].split(":").map(Number);
  const [endH, endM] = parts[1].split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
}

/** Gibt kontextuelle Hinweise basierend auf den Uhrzeiten (z.B. Schulzeit, Schlafenszeit) */
export function getTimeContext(austriaTime: string, baliTime: string): string | null {
  const [aH] = austriaTime.split(":").map(Number);
  const [bH] = baliTime.split(":").map(Number);

  // Österreich typische Tageszeiten
  if (aH >= 8 && aH < 15) {
    return "aber in Österreich vielleicht gerade Schule/Arbeit 📚";
  }
  if (aH >= 22 || aH < 6) {
    return "aber in Österreich schlafen die meisten schon 😴";
  }
  if (aH >= 6 && aH < 8) {
    return "aber in Österreich ist gerade Morgenroutine 🥐";
  }

  // Bali typische Tageszeiten
  if (bH >= 8 && bH < 15) {
    return "aber auf Bali vielleicht gerade Schule/Arbeit 📚";
  }
  if (bH >= 22 || bH < 6) {
    return "aber auf Bali schlafen die meisten schon 😴";
  }

  return null;
}