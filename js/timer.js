// Pomodoro-style focus timer (25 min focus / 5 min break). Persists
// {mode, status, endsAt, remainingMs} in chrome.storage.local: while running,
// endsAt is the absolute end timestamp so the remaining time can always be
// recomputed from Date.now(), which lets the timer survive a refresh, the
// tab closing, or running in several tabs at once (kept in sync via
// chrome.storage.onChanged). Completion is signalled visually only - no
// audio of any kind is used.

import { storage } from "./storage.js";
import { createIcon } from "./icons.js";

const STORAGE_KEY = "timer";
export const DURATIONS_KEY = "timerDurations";
const DEFAULT_DURATIONS_MIN = { focus: 25, break: 5 };

let DURATIONS = { focus: DEFAULT_DURATIONS_MIN.focus * 60 * 1000, break: DEFAULT_DURATIONS_MIN.break * 60 * 1000 };

function applyDurationSettings(settings) {
  const focusMin = Number(settings?.focusMin);
  const breakMin = Number(settings?.breakMin);
  DURATIONS = {
    focus: (Number.isFinite(focusMin) && focusMin > 0 ? focusMin : DEFAULT_DURATIONS_MIN.focus) * 60 * 1000,
    break: (Number.isFinite(breakMin) && breakMin > 0 ? breakMin : DEFAULT_DURATIONS_MIN.break) * 60 * 1000,
  };
}

function idleState(mode) {
  return { mode, status: "idle", endsAt: null, remainingMs: DURATIONS[mode] };
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function initTimer() {
  const defaultTitle = document.title;

  const displayEl = document.getElementById("timer-display");
  const modeEl = document.getElementById("timer-mode");
  const startBtn = document.getElementById("timer-start");
  const pauseBtn = document.getElementById("timer-pause");
  const resumeBtn = document.getElementById("timer-resume");
  const resetBtn = document.getElementById("timer-reset");
  const skipBtn = document.getElementById("timer-skip");
  const bannerEl = document.getElementById("timer-banner");
  const bannerTextEl = document.getElementById("timer-banner-text");
  const dismissBtn = document.getElementById("timer-dismiss");

  function prependIcon(btn, name) {
    const icon = createIcon(name, { size: 15 });
    btn.insertBefore(icon, btn.firstChild);
  }
  prependIcon(startBtn, "play");
  prependIcon(pauseBtn, "pause");
  prependIcon(resumeBtn, "play");
  prependIcon(resetBtn, "rotate-ccw");
  prependIcon(skipBtn, "skip-forward");
  dismissBtn.appendChild(createIcon("x", { size: 14 }));

  applyDurationSettings((await storage.sync.get(DURATIONS_KEY))[DURATIONS_KEY]);

  let state = (await storage.local.get(STORAGE_KEY))[STORAGE_KEY] || idleState("focus");
  let tickId = null;

  startBtn.addEventListener("click", async () => {
    if (state.status === "running") return;
    state = { mode: state.mode, status: "running", endsAt: Date.now() + state.remainingMs, remainingMs: state.remainingMs };
    await persist();
  });

  pauseBtn.addEventListener("click", async () => {
    if (state.status !== "running") return;
    const remaining = Math.max(0, state.endsAt - Date.now());
    state = { mode: state.mode, status: "paused", endsAt: null, remainingMs: remaining };
    await persist();
  });

  resumeBtn.addEventListener("click", async () => {
    if (state.status !== "paused") return;
    state = { mode: state.mode, status: "running", endsAt: Date.now() + state.remainingMs, remainingMs: state.remainingMs };
    await persist();
  });

  resetBtn.addEventListener("click", async () => {
    state = idleState(state.mode);
    await persist();
  });

  skipBtn.addEventListener("click", async () => {
    state = { mode: "break", status: "running", endsAt: Date.now() + DURATIONS.break, remainingMs: DURATIONS.break };
    await persist();
  });

  dismissBtn.addEventListener("click", async () => {
    if (state.status !== "done") return;
    state = idleState(state.mode);
    await persist();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      state = changes[STORAGE_KEY].newValue || idleState("focus");
      render();
    }
    if (areaName === "sync" && changes[DURATIONS_KEY]) {
      applyDurationSettings(changes[DURATIONS_KEY].newValue);
      if (state.status === "idle") {
        state = idleState(state.mode);
        render();
      }
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") render();
  });

  async function persist() {
    await storage.local.set({ [STORAGE_KEY]: state });
    render();
  }

  function scheduleTick() {
    if (tickId) clearInterval(tickId);
    tickId = setInterval(() => {
      if (document.visibilityState === "visible") render();
    }, 1000);
  }

  async function completeSession() {
    const nextMode = state.mode === "focus" ? "break" : "focus";
    state = { mode: nextMode, status: "done", endsAt: null, remainingMs: DURATIONS[nextMode] };
    await storage.local.set({ [STORAGE_KEY]: state });
  }

  function render() {
    const remaining = state.status === "running" ? Math.max(0, state.endsAt - Date.now()) : state.remainingMs;

    if (state.status === "running" && remaining <= 0) {
      completeSession();
      return;
    }

    displayEl.textContent = formatTime(remaining);
    displayEl.classList.toggle("pulse", state.status === "done");
    modeEl.textContent = state.mode === "focus" ? "Focus" : "Break";

    startBtn.hidden = state.status === "running" || state.status === "paused";
    pauseBtn.hidden = state.status !== "running";
    resumeBtn.hidden = state.status !== "paused";
    skipBtn.hidden = state.mode !== "focus" || state.status === "done";

    if (state.status === "done") {
      bannerEl.hidden = false;
      bannerTextEl.textContent = state.mode === "break"
        ? "Focus session done, take a break."
        : "Break's over, back to focus.";
      document.title = "Time's up \u23F1";
    } else {
      bannerEl.hidden = true;
      document.title = state.status === "running"
        ? `${formatTime(remaining)} \u00B7 ${state.mode === "focus" ? "Focus" : "Break"}`
        : defaultTitle;
    }
  }

  render();
  scheduleTick();
}
