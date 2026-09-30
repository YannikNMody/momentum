// Settings sheet: a single dialog (opened from the gear icon) that hosts
// General (name), Background (source, uploads, gallery), Weather (city,
// units), NFL (favorite team) and Focus (timer lengths). Everything here
// reads/writes the same chrome.storage keys the rest of the app already
// uses, so it stays in sync with the inline controls those features expose
// (e.g. the weather widget's own first-run city search).

import { storage } from "./storage.js";
import { createIcon } from "./icons.js";
import { BACKGROUND_KEY, SOURCE_KEY, PIN_KEY, PHOTOS_CHANGED_EVENT, customKey } from "./background.js";
import { addPhoto, getAllPhotos, deletePhoto, MAX_PHOTOS } from "./photoStore.js";
import { getRejectionMessage, processImageFile } from "./imageProcessing.js";
import { searchCities } from "./weather.js";
import { LOCATION_KEY, UNIT_KEY } from "./weather-widget.js";
import { extractTeams } from "./nfl.js";
import { CACHE_KEY as NFL_CACHE_KEY, FAVORITE_KEY } from "./nfl-widget.js";
import { DURATIONS_KEY } from "./timer.js";

const SEARCH_DEBOUNCE_MS = 300;

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function initSettings() {
  const gearBtn = document.getElementById("settings-toggle");
  const overlayEl = document.getElementById("settings-overlay");
  const sheetEl = document.getElementById("settings-sheet");
  const closeBtn = document.getElementById("settings-close");
  if (!gearBtn || !sheetEl) return;

  gearBtn.appendChild(createIcon("gear", { size: 18 }));
  closeBtn.appendChild(createIcon("x", { size: 18 }));

  // General
  const nameInput = document.getElementById("settings-name-input");

  // Background
  const sourceSelect = document.getElementById("settings-background-source");
  const dropzoneEl = document.getElementById("settings-dropzone");
  const fileInput = document.getElementById("settings-file-input");
  const uploadMessageEl = document.getElementById("settings-upload-message");
  const usageEl = document.getElementById("settings-storage-usage");
  const galleryEl = document.getElementById("settings-gallery");
  let galleryObjectUrls = [];

  // Weather
  const weatherCityInput = document.getElementById("settings-weather-city-input");
  const weatherResultsEl = document.getElementById("settings-weather-results");
  const weatherCurrentEl = document.getElementById("settings-weather-current");
  const unitCBtn = document.getElementById("settings-unit-c");
  const unitFBtn = document.getElementById("settings-unit-f");
  let weatherSearchTimer = null;

  // NFL
  const nflFavoriteSelect = document.getElementById("settings-nfl-favorite");

  // Focus
  const focusMinutesInput = document.getElementById("settings-focus-minutes");
  const breakMinutesInput = document.getElementById("settings-break-minutes");

  function focusableEls() {
    return [...sheetEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeSheet();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = focusableEls();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onOutsideClick(e) {
    if (sheetEl.contains(e.target) || e.target === gearBtn || gearBtn.contains(e.target)) return;
    closeSheet();
  }

  async function openSheet() {
    overlayEl.hidden = false;
    sheetEl.hidden = false;
    gearBtn.setAttribute("aria-expanded", "true");
    await refreshAll();
    const focusables = focusableEls();
    (focusables[0] || sheetEl).focus();
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("click", onOutsideClick, true);
  }

  function closeSheet() {
    overlayEl.hidden = true;
    sheetEl.hidden = true;
    gearBtn.setAttribute("aria-expanded", "false");
    gearBtn.focus();
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("click", onOutsideClick, true);
    for (const url of galleryObjectUrls) URL.revokeObjectURL(url);
    galleryObjectUrls = [];
  }

  gearBtn.setAttribute("aria-expanded", "false");
  gearBtn.addEventListener("click", () => {
    if (sheetEl.hidden) openSheet();
    else closeSheet();
  });
  closeBtn.addEventListener("click", closeSheet);

  // --- General ---------------------------------------------------------

  async function loadGeneral() {
    nameInput.value = (await storage.sync.get("name")).name || "";
  }

  nameInput.addEventListener("change", async () => {
    const value = nameInput.value.trim();
    if (!value) return;
    await storage.sync.set({ name: value });
  });

  // --- Background --------------------------------------------------------

  async function loadBackgroundSection() {
    sourceSelect.value = (await storage.sync.get(SOURCE_KEY))[SOURCE_KEY] || "bundled";
    await renderGallery();
  }

  sourceSelect.addEventListener("change", async () => {
    await storage.sync.set({ [SOURCE_KEY]: sourceSelect.value });
  });

  async function renderGallery() {
    let photos = [];
    try {
      photos = await getAllPhotos();
    } catch {
      photos = [];
    }

    const usage = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    usageEl.textContent = `${formatBytes(usage)} used \u00B7 ${photos.length}/${MAX_PHOTOS} photos`;

    for (const url of galleryObjectUrls) URL.revokeObjectURL(url);
    galleryObjectUrls = [];
    galleryEl.textContent = "";

    if (!photos.length) {
      const empty = document.createElement("li");
      empty.className = "settings-gallery-empty";
      empty.textContent = "No photos uploaded yet.";
      galleryEl.appendChild(empty);
      return;
    }

    const pin = (await storage.local.get(PIN_KEY))[PIN_KEY] || null;

    for (const photo of photos) {
      galleryEl.appendChild(renderGalleryItem(photo, pin));
    }
  }

  function renderGalleryItem(photo, pin) {
    const li = document.createElement("li");
    li.className = "settings-gallery-item";

    const url = URL.createObjectURL(photo.blob);
    galleryObjectUrls.push(url);

    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.className = "settings-gallery-thumb";
    li.appendChild(img);

    const key = customKey(photo.id);
    const isPinned = Boolean(pin && pin.key === key);
    if (isPinned) li.classList.add("settings-gallery-item-pinned");

    const actions = document.createElement("div");
    actions.className = "settings-gallery-actions";

    const setBtn = document.createElement("button");
    setBtn.type = "button";
    setBtn.className = "settings-gallery-btn";
    setBtn.appendChild(createIcon("image", { size: 13 }));
    setBtn.appendChild(document.createTextNode("Set as background"));
    setBtn.addEventListener("click", async () => {
      // "My photos" won't be in the pool at all if the source is set to
      // "Football photos" only - widen it so the pick actually takes.
      const source = (await storage.sync.get(SOURCE_KEY))[SOURCE_KEY] || "bundled";
      if (source === "bundled") await storage.sync.set({ [SOURCE_KEY]: "both" });
      await storage.local.set({ [BACKGROUND_KEY]: { date: todayKey(), key } });
    });

    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "settings-gallery-btn";
    pinBtn.appendChild(createIcon("pin", { size: 13 }));
    pinBtn.appendChild(document.createTextNode(isPinned ? "Unpin" : "Pin this photo"));
    pinBtn.addEventListener("click", async () => {
      if (!isPinned) {
        const source = (await storage.sync.get(SOURCE_KEY))[SOURCE_KEY] || "bundled";
        if (source === "bundled") await storage.sync.set({ [SOURCE_KEY]: "both" });
      }
      await storage.local.set({ [PIN_KEY]: isPinned ? null : { key } });
      await renderGallery();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "settings-gallery-btn settings-gallery-btn-danger";
    deleteBtn.appendChild(createIcon("trash", { size: 13 }));
    deleteBtn.appendChild(document.createTextNode("Delete"));
    deleteBtn.addEventListener("click", async () => {
      if (!window.confirm("Delete this photo?")) return;
      await deletePhoto(photo.id);
      if (isPinned) await storage.local.set({ [PIN_KEY]: null });
      window.dispatchEvent(new CustomEvent(PHOTOS_CHANGED_EVENT));
      await renderGallery();
    });

    actions.append(setBtn, pinBtn, deleteBtn);
    li.appendChild(actions);
    return li;
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const existing = await getAllPhotos();
    let remaining = MAX_PHOTOS - existing.length;
    let message = "";
    let addedAny = false;

    for (const file of files) {
      if (remaining <= 0) {
        message = `Limit of ${MAX_PHOTOS} photos reached.`;
        break;
      }
      const rejection = getRejectionMessage(file);
      if (rejection) {
        message = rejection;
        continue;
      }
      try {
        const { blob, width, height } = await processImageFile(file);
        const id = await addPhoto(blob, { width, height });
        if (id) {
          remaining -= 1;
          addedAny = true;
        } else {
          message = `Limit of ${MAX_PHOTOS} photos reached.`;
        }
      } catch {
        message = "Could not process that image.";
      }
    }

    uploadMessageEl.textContent = message || (addedAny ? "Photos added." : "");
    if (addedAny) {
      window.dispatchEvent(new CustomEvent(PHOTOS_CHANGED_EVENT));
      await renderGallery();
    }
  }

  fileInput.addEventListener("change", async () => {
    await handleFiles(fileInput.files);
    fileInput.value = "";
  });

  dropzoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzoneEl.classList.add("settings-dropzone-active");
  });
  dropzoneEl.addEventListener("dragleave", () => {
    dropzoneEl.classList.remove("settings-dropzone-active");
  });
  dropzoneEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzoneEl.classList.remove("settings-dropzone-active");
    await handleFiles(e.dataTransfer?.files);
  });

  // --- Weather -----------------------------------------------------------

  async function loadWeatherSection() {
    const location = (await storage.sync.get(LOCATION_KEY))[LOCATION_KEY] || null;
    weatherCurrentEl.textContent = location ? `Current city: ${location.name}` : "No city set yet.";

    const unit = (await storage.sync.get(UNIT_KEY))[UNIT_KEY] || "C";
    unitCBtn.setAttribute("aria-checked", String(unit === "C"));
    unitFBtn.setAttribute("aria-checked", String(unit === "F"));
    unitCBtn.classList.toggle("settings-unit-btn-active", unit === "C");
    unitFBtn.classList.toggle("settings-unit-btn-active", unit === "F");
  }

  unitCBtn.addEventListener("click", async () => {
    await storage.sync.set({ [UNIT_KEY]: "C" });
    await loadWeatherSection();
  });
  unitFBtn.addEventListener("click", async () => {
    await storage.sync.set({ [UNIT_KEY]: "F" });
    await loadWeatherSection();
  });

  weatherCityInput.addEventListener("input", () => {
    if (weatherSearchTimer) clearTimeout(weatherSearchTimer);
    weatherSearchTimer = setTimeout(runWeatherSearch, SEARCH_DEBOUNCE_MS);
  });

  async function runWeatherSearch() {
    const query = weatherCityInput.value.trim();
    weatherResultsEl.textContent = "";
    if (!query) return;

    let results = [];
    try {
      results = await searchCities(query);
    } catch {
      return;
    }

    for (const result of results) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-weather-result";
      btn.textContent = [result.name, result.region, result.country].filter(Boolean).join(", ");
      btn.addEventListener("click", async () => {
        const location = {
          name: result.name,
          region: result.region,
          country: result.country,
          lat: result.lat,
          lon: result.lon,
          timezone: result.timezone,
        };
        await storage.sync.set({ [LOCATION_KEY]: location });
        weatherCityInput.value = "";
        weatherResultsEl.textContent = "";
        await loadWeatherSection();
      });
      li.appendChild(btn);
      weatherResultsEl.appendChild(li);
    }
  }

  // --- NFL -----------------------------------------------------------------

  async function loadNflSection() {
    const cached = (await storage.local.get(NFL_CACHE_KEY))[NFL_CACHE_KEY] || null;
    const teams = extractTeams(cached?.games || []);
    const favorite = (await storage.sync.get(FAVORITE_KEY))[FAVORITE_KEY] || "";

    nflFavoriteSelect.textContent = "";
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = teams.length ? "No favorite" : "No scores loaded yet";
    nflFavoriteSelect.appendChild(noneOption);

    for (const team of teams) {
      const option = document.createElement("option");
      option.value = team.abbreviation;
      option.textContent = team.displayName;
      nflFavoriteSelect.appendChild(option);
    }
    nflFavoriteSelect.value = favorite;
  }

  nflFavoriteSelect.addEventListener("change", async () => {
    await storage.sync.set({ [FAVORITE_KEY]: nflFavoriteSelect.value });
  });

  // --- Focus -----------------------------------------------------------------

  async function loadFocusSection() {
    const durations = (await storage.sync.get(DURATIONS_KEY))[DURATIONS_KEY] || {};
    focusMinutesInput.value = durations.focusMin || 25;
    breakMinutesInput.value = durations.breakMin || 5;
  }

  async function saveDurations() {
    const focusMin = clamp(Math.round(Number(focusMinutesInput.value)) || 25, 1, 180);
    const breakMin = clamp(Math.round(Number(breakMinutesInput.value)) || 5, 1, 60);
    await storage.sync.set({ [DURATIONS_KEY]: { focusMin, breakMin } });
  }

  focusMinutesInput.addEventListener("change", saveDurations);
  breakMinutesInput.addEventListener("change", saveDurations);

  async function refreshAll() {
    await Promise.all([loadGeneral(), loadBackgroundSection(), loadWeatherSection(), loadNflSection(), loadFocusSection()]);
  }
}
