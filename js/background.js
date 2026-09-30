// Daily football background image, picked deterministically from the date so
// every new tab opened on the same day shows the same photo. A "next image"
// button lets the user cycle through the set; the choice is remembered for
// the rest of the day in chrome.storage.local under the "background" key.
// Images are bundled locally under images/ - nothing is fetched over the network.

import { storage } from "./storage.js";

const STORAGE_KEY = "background";
const CREDITS_URL = "images/credits.json";

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

export async function initBackground() {
  const imgEl = document.getElementById("background-image");
  const nextBtn = document.getElementById("background-next");
  const creditEl = document.getElementById("background-credit");

  let credits;
  try {
    const res = await fetch(chrome.runtime.getURL(CREDITS_URL));
    credits = await res.json();
  } catch {
    credits = null;
  }

  if (!Array.isArray(credits) || credits.length === 0) return;

  const today = todayKey();
  const defaultIndex = dayOfYear(new Date()) % credits.length;

  const stored = (await storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  let index = stored && stored.date === today ? stored.index % credits.length : defaultIndex;

  render(index);

  nextBtn.addEventListener("click", async () => {
    index = (index + 1) % credits.length;
    await storage.local.set({ [STORAGE_KEY]: { date: today, index } });
    render(index);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    const value = changes[STORAGE_KEY].newValue;
    if (value && value.date === today && value.index !== index) {
      index = value.index % credits.length;
      render(index);
    }
  });

  function render(i) {
    const entry = credits[i];
    if (!entry) return;

    imgEl.classList.remove("loaded");

    const loader = new Image();
    loader.onload = () => {
      imgEl.src = loader.src;
      imgEl.classList.add("loaded");
    };
    loader.onerror = () => {
      imgEl.removeAttribute("src");
      imgEl.classList.remove("loaded");
    };
    loader.src = chrome.runtime.getURL(`images/${entry.file}`);

    creditEl.textContent = "";
    const link = document.createElement("a");
    link.href = entry.photoUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `Photo by ${entry.photographer} on Unsplash`;
    creditEl.appendChild(link);
  }
}
