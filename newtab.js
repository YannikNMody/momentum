import { initClock } from "./js/clock.js";
import { initGreeting } from "./js/greeting.js";
import { initTodos } from "./js/todos.js";

document.addEventListener("DOMContentLoaded", async () => {
  const greeting = await initGreeting();
  initClock(() => greeting.refresh());
  initTodos();
});
