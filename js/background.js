// Daily background image. Picked deterministically from the date so every
// new tab opened on the same day shows the same photo, across a pool built
// from the bundled football photos, the user's uploaded photos (stored in
// IndexedDB via photoStore.js), or both - depending on the "Background
// source" setting. A "next image" button cycles the pool and remembers the
// day's choice; "Pin this photo" (set from the settings sheet) overrides
// the daily pick with a single fixed photo until unpinned. Object URLs for
// uploaded photos are revoked as soon as they're no longer shown.

import { storage } from "./storage.js";
import { getAllPhotos } from "./photoStore.js";

export const BACKGROUND_KEY = "background";
export const SOURCE_KEY = "backgroundSource";
export const PIN_KEY = "backgroundPin";
export const PHOTOS_CHANGED_EVENT = "momentum:photos-changed";

const CREDITS_URL = "images/credits.json";

export const bundledKey = (file) => `bundled:${file}`;
export const customKey = (id) => `custom:${id}`;

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

async function loadCredits() {
  try {
    const res = await fetch(chrome.runtime.getURL(CREDITS_URL));
    const credits = await res.json();
    return Array.isArray(credits) ? credits : [];
  } catch {
    return [];
  }
}

function buildPool(source, credits, customPhotos) {
  const bundled = credits.map((c) => ({ type: "bundled", key: bundledKey(c.file), ...c }));
  const custom = customPhotos.map((p) => ({ type: "custom", key: customKey(p.id), id: p.id, blob: p.blob }));

  if (source === "custom") return custom.length ? custom : bundled;
  if (source === "both") return [...bundled, ...custom];
  return bundled;
}

export async function initBackground() {
  const imgEl = document.getElementById("background-image");
  const nextBtn = document.getElementById("background-next");
  const creditEl = document.getElementById("background-credit");

  const credits = await loadCredits();

  let pool = [];
  let currentIndex = -1;
  let activeObjectUrl = null;

  async function resolvePool() {
    const source = (await storage.sync.get(SOURCE_KEY))[SOURCE_KEY] || "bundled";
    let customPhotos = [];
    try {
      customPhotos = await getAllPhotos();
    } catch {
      customPhotos = [];
    }
    return buildPool(source, credits, customPhotos);
  }

  function loadSrc(src, revokeAfterLoad) {
    imgEl.classList.remove("loaded");
    const loader = new Image();
    loader.onload = () => {
      imgEl.src = loader.src;
      imgEl.classList.add("loaded");
      if (revokeAfterLoad) URL.revokeObjectURL(revokeAfterLoad);
    };
    loader.onerror = () => {
      imgEl.removeAttribute("src");
      imgEl.classList.remove("loaded");
    };
    loader.src = src;
  }

  function setCredit(item) {
    creditEl.textContent = "";
    if (item.type === "custom") {
      creditEl.textContent = "Your photo";
      return;
    }
    const link = document.createElement("a");
    link.href = item.photoUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `Photo by ${item.photographer} on Unsplash`;
    creditEl.appendChild(link);
  }

  function renderItem(item) {
    const previousObjectUrl = activeObjectUrl;
    if (item.type === "custom") {
      activeObjectUrl = URL.createObjectURL(item.blob);
      loadSrc(activeObjectUrl, previousObjectUrl);
    } else {
      activeObjectUrl = null;
      loadSrc(chrome.runtime.getURL(`images/${item.file}`), previousObjectUrl);
    }
    setCredit(item);
  }

  async function pickAndRender() {
    pool = await resolvePool();
    nextBtn.disabled = pool.length === 0;
    if (pool.length === 0) return;

    const pin = (await storage.local.get(PIN_KEY))[PIN_KEY] || null;
    let index = -1;

    if (pin) {
      index = pool.findIndex((p) => p.key === pin.key);
    }

    if (index === -1) {
      const today = todayKey();
      const stored = (await storage.local.get(BACKGROUND_KEY))[BACKGROUND_KEY];
      if (stored && stored.date === today) {
        index = pool.findIndex((p) => p.key === stored.key);
      }
      if (index === -1) index = dayOfYear(new Date()) % pool.length;
    }

    currentIndex = index;
    nextBtn.classList.toggle("background-next-pinned", Boolean(pin));
    renderItem(pool[index]);
  }

  nextBtn.addEventListener("click", async () => {
    if (!pool.length) return;
    const pin = (await storage.local.get(PIN_KEY))[PIN_KEY] || null;
    if (pin) return;

    currentIndex = (currentIndex + 1) % pool.length;
    const item = pool[currentIndex];
    await storage.local.set({ [BACKGROUND_KEY]: { date: todayKey(), key: item.key } });
    renderItem(item);
  });

  window.addEventListener(PHOTOS_CHANGED_EVENT, pickAndRender);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && (changes[BACKGROUND_KEY] || changes[PIN_KEY])) pickAndRender();
    if (areaName === "sync" && changes[SOURCE_KEY]) pickAndRender();
  });

  await pickAndRender();
}
