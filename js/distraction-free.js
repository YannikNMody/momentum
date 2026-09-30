// Distraction-free view: hides secondary UI (todos, background controls,
// scores widget, etc. - anything tagged with the "distraction-hide" class),
// leaving the background, clock, main focus and timer. Toggled with a button
// or the "F" key (ignored while typing in a field). State is persisted.

import { storage } from "./storage.js";

const STORAGE_KEY = "distractionFree";

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export async function initDistractionFree() {
  const toggleBtn = document.getElementById("distraction-toggle");

  let enabled = Boolean((await storage.local.get(STORAGE_KEY))[STORAGE_KEY]);
  apply();

  toggleBtn.addEventListener("click", async () => {
    enabled = !enabled;
    await storage.local.set({ [STORAGE_KEY]: enabled });
    apply();
  });

  document.addEventListener("keydown", async (e) => {
    if (e.key.toLowerCase() !== "f") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTyping(e.target)) return;
    enabled = !enabled;
    await storage.local.set({ [STORAGE_KEY]: enabled });
    apply();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    enabled = Boolean(changes[STORAGE_KEY].newValue);
    apply();
  });

  function apply() {
    document.body.classList.toggle("distraction-free", enabled);
    toggleBtn.textContent = enabled ? "Show controls" : "Focus view";
    toggleBtn.setAttribute("aria-pressed", String(enabled));
  }
}
