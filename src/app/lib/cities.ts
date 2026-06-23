// Curated, offline city list: each entry carries everything we need to place a
// person on the map and reason about their local time — no geocoding needed.

export interface City {
  id: string; // stable slug
  name: string; // display name
  country: string;
  flag: string; // emoji
  lat: number;
  lon: number;
  tz: string; // IANA timezone
}

export interface Location {
  cityId: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  tz: string;
}

export const CITIES: City[] = [
  // Europe
  { id: "wien", name: "Wien", country: "Österreich", flag: "🇦🇹", lat: 48.21, lon: 16.37, tz: "Europe/Vienna" },
  { id: "graz", name: "Graz", country: "Österreich", flag: "🇦🇹", lat: 47.07, lon: 15.44, tz: "Europe/Vienna" },
  { id: "salzburg", name: "Salzburg", country: "Österreich", flag: "🇦🇹", lat: 47.81, lon: 13.05, tz: "Europe/Vienna" },
  { id: "innsbruck", name: "Innsbruck", country: "Österreich", flag: "🇦🇹", lat: 47.27, lon: 11.39, tz: "Europe/Vienna" },
  { id: "berlin", name: "Berlin", country: "Deutschland", flag: "🇩🇪", lat: 52.52, lon: 13.4, tz: "Europe/Berlin" },
  { id: "muenchen", name: "München", country: "Deutschland", flag: "🇩🇪", lat: 48.14, lon: 11.58, tz: "Europe/Berlin" },
  { id: "hamburg", name: "Hamburg", country: "Deutschland", flag: "🇩🇪", lat: 53.55, lon: 9.99, tz: "Europe/Berlin" },
  { id: "zuerich", name: "Zürich", country: "Schweiz", flag: "🇨🇭", lat: 47.37, lon: 8.54, tz: "Europe/Zurich" },
  { id: "paris", name: "Paris", country: "Frankreich", flag: "🇫🇷", lat: 48.86, lon: 2.35, tz: "Europe/Paris" },
  { id: "amsterdam", name: "Amsterdam", country: "Niederlande", flag: "🇳🇱", lat: 52.37, lon: 4.9, tz: "Europe/Amsterdam" },
  { id: "london", name: "London", country: "Vereinigtes Königreich", flag: "🇬🇧", lat: 51.51, lon: -0.13, tz: "Europe/London" },
  { id: "madrid", name: "Madrid", country: "Spanien", flag: "🇪🇸", lat: 40.42, lon: -3.7, tz: "Europe/Madrid" },
  { id: "barcelona", name: "Barcelona", country: "Spanien", flag: "🇪🇸", lat: 41.39, lon: 2.17, tz: "Europe/Madrid" },
  { id: "rom", name: "Rom", country: "Italien", flag: "🇮🇹", lat: 41.9, lon: 12.5, tz: "Europe/Rome" },
  { id: "lissabon", name: "Lissabon", country: "Portugal", flag: "🇵🇹", lat: 38.72, lon: -9.14, tz: "Europe/Lisbon" },
  { id: "athen", name: "Athen", country: "Griechenland", flag: "🇬🇷", lat: 37.98, lon: 23.73, tz: "Europe/Athens" },
  { id: "stockholm", name: "Stockholm", country: "Schweden", flag: "🇸🇪", lat: 59.33, lon: 18.07, tz: "Europe/Stockholm" },
  { id: "kopenhagen", name: "Kopenhagen", country: "Dänemark", flag: "🇩🇰", lat: 55.68, lon: 12.57, tz: "Europe/Copenhagen" },
  { id: "oslo", name: "Oslo", country: "Norwegen", flag: "🇳🇴", lat: 59.91, lon: 10.75, tz: "Europe/Oslo" },
  { id: "warschau", name: "Warschau", country: "Polen", flag: "🇵🇱", lat: 52.23, lon: 21.01, tz: "Europe/Warsaw" },
  { id: "prag", name: "Prag", country: "Tschechien", flag: "🇨🇿", lat: 50.08, lon: 14.44, tz: "Europe/Prague" },
  { id: "budapest", name: "Budapest", country: "Ungarn", flag: "🇭🇺", lat: 47.5, lon: 19.04, tz: "Europe/Budapest" },
  { id: "istanbul", name: "Istanbul", country: "Türkei", flag: "🇹🇷", lat: 41.01, lon: 28.98, tz: "Europe/Istanbul" },
  { id: "moskau", name: "Moskau", country: "Russland", flag: "🇷🇺", lat: 55.76, lon: 37.62, tz: "Europe/Moscow" },

  // Africa
  { id: "kairo", name: "Kairo", country: "Ägypten", flag: "🇪🇬", lat: 30.04, lon: 31.24, tz: "Africa/Cairo" },
  { id: "lagos", name: "Lagos", country: "Nigeria", flag: "🇳🇬", lat: 6.52, lon: 3.38, tz: "Africa/Lagos" },
  { id: "nairobi", name: "Nairobi", country: "Kenia", flag: "🇰🇪", lat: -1.29, lon: 36.82, tz: "Africa/Nairobi" },
  { id: "kapstadt", name: "Kapstadt", country: "Südafrika", flag: "🇿🇦", lat: -33.92, lon: 18.42, tz: "Africa/Johannesburg" },
  { id: "casablanca", name: "Casablanca", country: "Marokko", flag: "🇲🇦", lat: 33.57, lon: -7.59, tz: "Africa/Casablanca" },

  // Middle East
  { id: "dubai", name: "Dubai", country: "VAE", flag: "🇦🇪", lat: 25.2, lon: 55.27, tz: "Asia/Dubai" },
  { id: "telaviv", name: "Tel Aviv", country: "Israel", flag: "🇮🇱", lat: 32.08, lon: 34.78, tz: "Asia/Jerusalem" },

  // Asia
  { id: "denpasar", name: "Bali (Denpasar)", country: "Indonesien", flag: "🇮🇩", lat: -8.65, lon: 115.22, tz: "Asia/Makassar" },
  { id: "jakarta", name: "Jakarta", country: "Indonesien", flag: "🇮🇩", lat: -6.21, lon: 106.85, tz: "Asia/Jakarta" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", flag: "🇹🇭", lat: 13.76, lon: 100.5, tz: "Asia/Bangkok" },
  { id: "singapur", name: "Singapur", country: "Singapur", flag: "🇸🇬", lat: 1.35, lon: 103.82, tz: "Asia/Singapore" },
  { id: "delhi", name: "Delhi", country: "Indien", flag: "🇮🇳", lat: 28.61, lon: 77.21, tz: "Asia/Kolkata" },
  { id: "tokio", name: "Tokio", country: "Japan", flag: "🇯🇵", lat: 35.68, lon: 139.69, tz: "Asia/Tokyo" },
  { id: "seoul", name: "Seoul", country: "Südkorea", flag: "🇰🇷", lat: 37.57, lon: 126.98, tz: "Asia/Seoul" },
  { id: "hongkong", name: "Hongkong", country: "China", flag: "🇭🇰", lat: 22.32, lon: 114.17, tz: "Asia/Hong_Kong" },
  { id: "shanghai", name: "Shanghai", country: "China", flag: "🇨🇳", lat: 31.23, lon: 121.47, tz: "Asia/Shanghai" },

  // Oceania
  { id: "sydney", name: "Sydney", country: "Australien", flag: "🇦🇺", lat: -33.87, lon: 151.21, tz: "Australia/Sydney" },
  { id: "melbourne", name: "Melbourne", country: "Australien", flag: "🇦🇺", lat: -37.81, lon: 144.96, tz: "Australia/Melbourne" },
  { id: "auckland", name: "Auckland", country: "Neuseeland", flag: "🇳🇿", lat: -36.85, lon: 174.76, tz: "Pacific/Auckland" },

  // Americas
  { id: "newyork", name: "New York", country: "USA", flag: "🇺🇸", lat: 40.71, lon: -74.01, tz: "America/New_York" },
  { id: "chicago", name: "Chicago", country: "USA", flag: "🇺🇸", lat: 41.88, lon: -87.63, tz: "America/Chicago" },
  { id: "losangeles", name: "Los Angeles", country: "USA", flag: "🇺🇸", lat: 34.05, lon: -118.24, tz: "America/Los_Angeles" },
  { id: "miami", name: "Miami", country: "USA", flag: "🇺🇸", lat: 25.76, lon: -80.19, tz: "America/New_York" },
  { id: "toronto", name: "Toronto", country: "Kanada", flag: "🇨🇦", lat: 43.65, lon: -79.38, tz: "America/Toronto" },
  { id: "mexico", name: "Mexiko-Stadt", country: "Mexiko", flag: "🇲🇽", lat: 19.43, lon: -99.13, tz: "America/Mexico_City" },
  { id: "saopaulo", name: "São Paulo", country: "Brasilien", flag: "🇧🇷", lat: -23.55, lon: -46.63, tz: "America/Sao_Paulo" },
  { id: "buenosaires", name: "Buenos Aires", country: "Argentinien", flag: "🇦🇷", lat: -34.6, lon: -58.38, tz: "America/Argentina/Buenos_Aires" },
];

export const DEFAULT_CITY_ID = "wien";

export function findCity(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

export function cityToLocation(city: City): Location {
  return {
    cityId: city.id,
    name: city.name,
    country: city.country,
    flag: city.flag,
    lat: city.lat,
    lon: city.lon,
    tz: city.tz,
  };
}

export function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  return CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  ).slice(0, limit);
}

// Map a legacy "austria" | "bali" timezone id to a Location (back-compat).
const LEGACY_TZ_TO_CITY: Record<string, string> = {
  austria: "wien",
  bali: "denpasar",
};

/**
 * Normalise any stored shape into a full Location:
 *  - a Location object (returned as-is when complete)
 *  - a legacy "austria" | "bali" string
 *  - undefined → null
 */
export function resolveLocation(input: unknown): Location | null {
  if (!input) return null;
  if (typeof input === "string") {
    const cityId = LEGACY_TZ_TO_CITY[input];
    const city = cityId ? findCity(cityId) : undefined;
    return city ? cityToLocation(city) : null;
  }
  if (typeof input === "object") {
    const o = input as Partial<Location> & { cityId?: string };
    if (typeof o.tz === "string" && typeof o.lat === "number" && typeof o.lon === "number") {
      return {
        cityId: o.cityId || "",
        name: o.name || "",
        country: o.country || "",
        flag: o.flag || "📍",
        lat: o.lat,
        lon: o.lon,
        tz: o.tz,
      };
    }
    if (o.cityId) {
      const city = findCity(o.cityId);
      return city ? cityToLocation(city) : null;
    }
  }
  return null;
}

// Normalise the localStorage `ff_user` blob across old/new formats.
export function normalizeStoredUser(
  raw: string | null
): { name: string; location: Location } | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj?.name) return null;
    const location = resolveLocation(obj.location ?? obj.timezone);
    if (!location) return null;
    return { name: obj.name, location };
  } catch {
    return null;
  }
}
