// Main focus for today. Stored as {text, done, date} in chrome.storage.local;
// if the stored date isn't today, the focus is treated as unset.

import { storage } from "./storage.js";
import { createIcon } from "./icons.js";

const STORAGE_KEY = "focus";

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function initFocus() {
  const formEl = document.getElementById("focus-form");
  const inputEl = document.getElementById("focus-input");
  const displayEl = document.getElementById("focus-display");
  const checkboxEl = document.getElementById("focus-checkbox");
  const textEl = document.getElementById("focus-text");
  const editBtn = document.getElementById("focus-edit-btn");
  const clearBtn = document.getElementById("focus-clear-btn");

  editBtn.appendChild(createIcon("pencil", { size: 15 }));
  clearBtn.appendChild(createIcon("x", { size: 15 }));

  const today = todayKey();

  let focus = (await storage.local.get(STORAGE_KEY))[STORAGE_KEY] || null;
  if (focus && focus.date !== today) focus = null;

  let editing = false;

  render();

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();

    if (!text) {
      if (editing) {
        editing = false;
        render();
      }
      return;
    }

    focus = { text, done: editing && focus ? focus.done : false, date: today };
    editing = false;
    await save();
    render();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editing) {
      editing = false;
      render();
    }
  });

  checkboxEl.addEventListener("change", async () => {
    if (!focus) return;
    focus.done = checkboxEl.checked;
    await save();
    render();
  });

  editBtn.addEventListener("click", () => {
    editing = true;
    render();
  });

  clearBtn.addEventListener("click", async () => {
    focus = null;
    editing = false;
    await save();
    render();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    const value = changes[STORAGE_KEY].newValue || null;
    focus = value && value.date === today ? value : null;
    editing = false;
    render();
  });

  async function save() {
    await storage.local.set({ [STORAGE_KEY]: focus });
  }

  function render() {
    if (!focus || editing) {
      formEl.hidden = false;
      displayEl.hidden = true;
      inputEl.value = focus ? focus.text : "";
      if (editing) {
        requestAnimationFrame(() => {
          inputEl.focus();
          inputEl.select();
        });
      }
      return;
    }

    formEl.hidden = true;
    displayEl.hidden = false;
    checkboxEl.checked = focus.done;
    textEl.textContent = focus.text;
    textEl.classList.toggle("done", focus.done);
  }
}
