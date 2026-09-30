// All Open-Meteo fetching, parsing and WMO weather-code mapping lives here,
// kept free of DOM/storage concerns so the data source is easy to swap
// later. Uses Open-Meteo's free, keyless geocoding and forecast APIs. Every
// field read from a response is validated defensively.

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather interpretation codes -> a small icon/label vocabulary. Only
// "clear" and "partly-cloudy" get day/night icon variants, per design.
const CODE_TABLE = [
  { codes: [0], label: "Clear sky", icon: "clear" },
  { codes: [1, 2], label: "Partly cloudy", icon: "partly-cloudy" },
  { codes: [3], label: "Overcast", icon: "cloudy" },
  { codes: [45, 48], label: "Fog", icon: "fog" },
  { codes: [51, 53, 55, 56, 57], label: "Drizzle", icon: "drizzle" },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: "Rain", icon: "rain" },
  { codes: [71, 73, 75, 77, 85, 86], label: "Snow", icon: "snow" },
  { codes: [95, 96, 99], label: "Thunderstorm", icon: "thunderstorm" },
];

function conditionFor(code) {
  const entry = CODE_TABLE.find((row) => row.codes.includes(code));
  return entry || { label: "Unknown", icon: "cloudy" };
}

// Returns the icon name to hand to createIcon(), applying the day/night
// suffix only for the two conditions that have variants.
export function iconNameFor(code, isDay) {
  const { icon } = conditionFor(code);
  if (icon === "clear" || icon === "partly-cloudy") {
    return `${icon}-${isDay ? "day" : "night"}`;
  }
  return icon;
}

export function conditionLabelFor(code) {
  return conditionFor(code).label;
}

export function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 32;
}

export function formatTemp(celsius, unit) {
  if (typeof celsius !== "number" || Number.isNaN(celsius)) return "--°";
  const value = unit === "F" ? celsiusToFahrenheit(celsius) : celsius;
  return `${Math.round(value)}°`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  return res.json();
}

// Searches for a city by name, returning a normalized, deduplicated list.
export async function searchCities(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
  const raw = await fetchJson(url);
  const results = Array.isArray(raw?.results) ? raw.results : [];

  return results
    .map((r) => ({
      name: typeof r?.name === "string" ? r.name : null,
      region: typeof r?.admin1 === "string" ? r.admin1 : "",
      country: typeof r?.country === "string" ? r.country : "",
      lat: typeof r?.latitude === "number" ? r.latitude : null,
      lon: typeof r?.longitude === "number" ? r.longitude : null,
      timezone: typeof r?.timezone === "string" ? r.timezone : "auto",
    }))
    .filter((r) => r.name && typeof r.lat === "number" && typeof r.lon === "number");
}

function parseHourly(raw, fromTime) {
  const times = raw?.hourly?.time;
  const temps = raw?.hourly?.temperature_2m;
  const codes = raw?.hourly?.weather_code;
  if (!Array.isArray(times) || !Array.isArray(temps) || !Array.isArray(codes)) return [];

  let startIndex = times.findIndex((t) => t >= fromTime);
  if (startIndex === -1) startIndex = 0;

  const hours = [];
  for (let i = startIndex; i < Math.min(startIndex + 6, times.length); i++) {
    if (typeof temps[i] !== "number" || typeof codes[i] !== "number") continue;
    hours.push({ time: times[i], temp: temps[i], code: codes[i] });
  }
  return hours;
}

// Fetches and normalizes a forecast for a {lat, lon, timezone} location.
export async function fetchForecast({ lat, lon, timezone }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    hourly: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,weather_code",
    timezone: timezone || "auto",
    forecast_days: "2",
  });

  const raw = await fetchJson(`${FORECAST_URL}?${params.toString()}`);

  const current = raw?.current;
  if (!current || typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") {
    return null;
  }

  const daily = raw?.daily;
  const hourly = parseHourly(raw, current.time);

  return {
    temp: current.temperature_2m,
    feelsLike: typeof current.apparent_temperature === "number" ? current.apparent_temperature : current.temperature_2m,
    code: current.weather_code,
    isDay: current.is_day !== 0,
    high: Array.isArray(daily?.temperature_2m_max) && typeof daily.temperature_2m_max[0] === "number" ? daily.temperature_2m_max[0] : null,
    low: Array.isArray(daily?.temperature_2m_min) && typeof daily.temperature_2m_min[0] === "number" ? daily.temperature_2m_min[0] : null,
    hourly,
  };
}
