// Weather widget: shows a compact pill (icon, current temp, city) that
// expands on click into condition/feels-like/high-low/next-6-hours detail.
// If no city is saved yet, shows "Set your city" and opens a debounced
// search against Open-Meteo's geocoding API. Forecast responses are cached
// in chrome.storage.local and refetched at most every 30 minutes; on
// failure or while offline, cached data is shown with an "updated" note, or
// the widget hides quietly if there's nothing cached yet.

import { storage } from "./storage.js";
import { createIcon } from "./icons.js";
import { searchCities, fetchForecast, iconNameFor, conditionLabelFor, formatTemp } from "./weather.js";

export const LOCATION_KEY = "weatherLocation";
export const UNIT_KEY = "weatherUnit";
const CACHE_KEY = "weatherCache";
const REFRESH_MS = 30 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 300;

const hourFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });

function formatUpdated(fetchedAt) {
  if (!fetchedAt) return "";
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(fetchedAt));
  return `Updated ${time}`;
}

function setIcon(container, name) {
  container.textContent = "";
  container.appendChild(createIcon(name, { size: 18 }));
}

export async function initWeatherWidget() {
  const widgetEl = document.getElementById("weather-widget");
  if (!widgetEl) return;

  const toggleBtn = document.getElementById("weather-toggle");
  const iconEl = document.getElementById("weather-icon");
  const tempEl = document.getElementById("weather-temp");
  const cityEl = document.getElementById("weather-city");
  const panelEl = document.getElementById("weather-panel");
  const conditionEl = document.getElementById("weather-condition");
  const feelsLikeEl = document.getElementById("weather-feels-like");
  const highLowEl = document.getElementById("weather-highlow");
  const hourlyEl = document.getElementById("weather-hourly");
  const updatedEl = document.getElementById("weather-updated");
  const searchWrapEl = document.getElementById("weather-search");
  const searchInputEl = document.getElementById("weather-search-input");
  const searchResultsEl = document.getElementById("weather-search-results");

  let location = (await storage.sync.get(LOCATION_KEY))[LOCATION_KEY] || null;
  let unit = (await storage.sync.get(UNIT_KEY))[UNIT_KEY] || "C";
  let cached = (await storage.local.get(CACHE_KEY))[CACHE_KEY] || null;
  let expanded = false;
  let searching = false;
  let searchTimer = null;

  toggleBtn.addEventListener("click", () => {
    if (!location) {
      searching = !searching;
      render();
      if (searching) searchInputEl.focus();
      return;
    }
    expanded = !expanded;
    render();
  });

  searchInputEl.addEventListener("input", () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
  });

  async function runSearch() {
    const query = searchInputEl.value.trim();
    searchResultsEl.textContent = "";
    if (!query) return;

    let results = [];
    try {
      results = await searchCities(query);
    } catch {
      return;
    }

    searchResultsEl.textContent = "";
    for (const result of results) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "weather-result";
      const parts = [result.name, result.region, result.country].filter(Boolean);
      btn.textContent = parts.join(", ");
      btn.addEventListener("click", async () => {
        location = { name: result.name, region: result.region, country: result.country, lat: result.lat, lon: result.lon, timezone: result.timezone };
        await storage.sync.set({ [LOCATION_KEY]: location });
        searching = false;
        searchInputEl.value = "";
        searchResultsEl.textContent = "";
        cached = null;
        render();
        await refresh();
      });
      li.appendChild(btn);
      searchResultsEl.appendChild(li);
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes[LOCATION_KEY]) {
      location = changes[LOCATION_KEY].newValue || null;
      render();
    }
    if (areaName === "sync" && changes[UNIT_KEY]) {
      unit = changes[UNIT_KEY].newValue || "C";
      render();
    }
    if (areaName === "local" && changes[CACHE_KEY]) {
      cached = changes[CACHE_KEY].newValue || null;
      render();
    }
  });

  async function refresh() {
    if (!location) return;

    const sameLocation = cached && cached.location && cached.location.lat === location.lat && cached.location.lon === location.lon;
    const isFresh = sameLocation && typeof cached.fetchedAt === "number" && Date.now() - cached.fetchedAt < REFRESH_MS;
    if (isFresh) return;

    try {
      const data = await fetchForecast(location);
      if (data) {
        cached = { location: { lat: location.lat, lon: location.lon }, data, fetchedAt: Date.now() };
        await storage.local.set({ [CACHE_KEY]: cached });
      }
    } catch {
      // Offline/API failure: fall back to whatever is already cached.
    }
    render();
  }

  function renderHourly(hourly) {
    hourlyEl.textContent = "";
    for (const hour of hourly) {
      const li = document.createElement("li");
      li.className = "weather-hour";

      const label = document.createElement("span");
      label.className = "weather-hour-label";
      label.textContent = hourFormatter.format(new Date(hour.time));

      const icon = document.createElement("span");
      icon.className = "weather-hour-icon";
      icon.appendChild(createIcon(iconNameFor(hour.code, true), { size: 16 }));

      const temp = document.createElement("span");
      temp.className = "weather-hour-temp";
      temp.textContent = formatTemp(hour.temp, unit);

      li.append(label, icon, temp);
      hourlyEl.appendChild(li);
    }
  }

  function render() {
    widgetEl.classList.toggle("weather-no-location", !location);
    searchWrapEl.hidden = !searching;
    toggleBtn.setAttribute("aria-expanded", String(expanded));

    if (!location) {
      setIcon(iconEl, "map-pin");
      tempEl.textContent = "";
      cityEl.textContent = "Set your city";
      panelEl.hidden = true;
      return;
    }

    const data = cached?.data || null;
    panelEl.hidden = !expanded || !data;

    if (!data) {
      setIcon(iconEl, "cloudy");
      tempEl.textContent = "--°";
      cityEl.textContent = location.name;
      return;
    }

    setIcon(iconEl, iconNameFor(data.code, data.isDay));
    tempEl.textContent = formatTemp(data.temp, unit);
    cityEl.textContent = location.name;

    conditionEl.textContent = conditionLabelFor(data.code);
    feelsLikeEl.textContent = `Feels like ${formatTemp(data.feelsLike, unit)}`;
    highLowEl.textContent = data.high !== null && data.low !== null
      ? `High ${formatTemp(data.high, unit)} · Low ${formatTemp(data.low, unit)}`
      : "";
    renderHourly(data.hourly || []);
    updatedEl.textContent = formatUpdated(cached.fetchedAt);
  }

  render();
  await refresh();
}
