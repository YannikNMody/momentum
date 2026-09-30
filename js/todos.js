// Todo panel backed by chrome.storage.local under the "todos" key.
// Listens for chrome.storage.onChanged so multiple open new tabs stay in sync.

import { storage } from "./storage.js";
import { createIcon } from "./icons.js";

const STORAGE_KEY = "todos";

export async function initTodos() {
  const listEl = document.getElementById("todo-list");
  const formEl = document.getElementById("todo-form");
  const inputEl = document.getElementById("todo-input");
  const emptyEl = document.getElementById("todo-empty");
  const countEl = document.getElementById("todo-count");
  const toggleBtn = document.getElementById("todo-toggle");
  const bodyEl = document.getElementById("todo-body");

  let todos = (await storage.local.get(STORAGE_KEY))[STORAGE_KEY] || [];
  let editingId = null;

  toggleBtn.addEventListener("click", () => {
    const collapsed = bodyEl.classList.toggle("collapsed");
    toggleBtn.setAttribute("aria-expanded", String(!collapsed));
  });

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    todos.push({ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() });
    inputEl.value = "";
    await save();
    render();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    todos = changes[STORAGE_KEY].newValue || [];
    render();
  });

  async function save() {
    await storage.local.set({ [STORAGE_KEY]: todos });
  }

  function render() {
    listEl.textContent = "";
    emptyEl.hidden = todos.length !== 0;

    const remaining = todos.filter((t) => !t.done).length;
    countEl.textContent = todos.length ? `${remaining}/${todos.length}` : "";

    for (const todo of todos) {
      listEl.appendChild(renderTodoItem(todo));
    }
  }

  function renderTodoItem(todo) {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", async () => {
      todo.done = checkbox.checked;
      await save();
      render();
    });
    li.appendChild(checkbox);

    if (editingId === todo.id) {
      li.appendChild(renderEditInput(todo));
    } else {
      li.appendChild(renderText(todo));
      li.appendChild(renderEditButton(todo));
    }

    li.appendChild(renderDeleteButton(todo));

    return li;
  }

  function renderText(todo) {
    const textEl = document.createElement("span");
    textEl.className = "todo-text";
    textEl.textContent = todo.text;
    if (todo.done) textEl.classList.add("done");
    textEl.addEventListener("dblclick", () => {
      editingId = todo.id;
      render();
    });
    return textEl;
  }

  function renderEditButton(todo) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "todo-edit-btn";
    editBtn.setAttribute("aria-label", "Edit todo");
    editBtn.appendChild(createIcon("pencil", { size: 14 }));
    editBtn.addEventListener("click", () => {
      editingId = todo.id;
      render();
    });
    return editBtn;
  }

  function renderDeleteButton(todo) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "todo-delete-btn";
    deleteBtn.setAttribute("aria-label", "Delete todo");
    deleteBtn.appendChild(createIcon("trash", { size: 14 }));
    deleteBtn.addEventListener("click", async () => {
      todos = todos.filter((t) => t.id !== todo.id);
      await save();
      render();
    });
    return deleteBtn;
  }

  function renderEditInput(todo) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit-input";
    input.value = todo.text;

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    let finished = false;

    const commit = async () => {
      if (finished) return;
      finished = true;
      const value = input.value.trim();
      if (value) {
        todo.text = value;
        await save();
      }
      editingId = null;
      render();
    };

    const cancel = () => {
      if (finished) return;
      finished = true;
      editingId = null;
      render();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      else if (e.key === "Escape") cancel();
    });
    input.addEventListener("blur", commit);

    return input;
  }

  render();
}
