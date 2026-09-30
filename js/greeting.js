// Greeting with time-of-day message and an editable name stored in
// chrome.storage.sync. On first run (no name saved), shows an inline
// "What's your name?" prompt instead of a greeting.

import { storage } from "./storage.js";

function greetingWord(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

export async function initGreeting() {
  const container = document.getElementById("greeting");
  let name = (await storage.sync.get("name")).name || "";
  let editing = false;

  function renderGreeting() {
    if (editing) return;
    container.textContent = "";

    if (!name) {
      renderPrompt();
      return;
    }

    const before = document.createTextNode(`${greetingWord(new Date().getHours())}, `);
    const nameEl = document.createElement("span");
    nameEl.textContent = name;
    nameEl.className = "greeting-name";
    nameEl.tabIndex = 0;
    nameEl.setAttribute("role", "button");
    nameEl.title = "Click to edit your name";
    nameEl.addEventListener("click", renderEdit);
    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") renderEdit();
    });
    const after = document.createTextNode(".");

    container.append(before, nameEl, after);
  }

  function renderPrompt() {
    editing = true;
    const label = document.createElement("label");
    label.textContent = "What's your name? ";
    label.htmlFor = "name-input";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "name-input";
    input.className = "name-input";
    input.placeholder = "Your name";

    container.append(label, input);
    input.focus();

    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const value = input.value.trim();
        if (!value) return;
        name = value;
        await storage.sync.set({ name });
        editing = false;
        renderGreeting();
      }
    });
  }

  function renderEdit() {
    editing = true;
    container.textContent = "";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "name-input";
    input.value = name;
    container.appendChild(input);
    input.focus();
    input.select();

    let finished = false;

    const commit = async () => {
      if (finished) return;
      finished = true;
      const value = input.value.trim();
      if (value) {
        name = value;
        await storage.sync.set({ name });
      }
      editing = false;
      renderGreeting();
    };

    const cancel = () => {
      if (finished) return;
      finished = true;
      editing = false;
      renderGreeting();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      else if (e.key === "Escape") cancel();
    });
    input.addEventListener("blur", commit);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.name) return;
    const value = changes.name.newValue || "";
    if (value === name || editing) return;
    name = value;
    renderGreeting();
  });

  renderGreeting();

  return {
    refresh: renderGreeting,
  };
}
