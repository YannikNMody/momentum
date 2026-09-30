import { initBackground } from "./js/background.js";
import { initClock } from "./js/clock.js";
import { initGreeting } from "./js/greeting.js";
import { initTodos } from "./js/todos.js";

document.addEventListener("DOMContentLoaded", async () => {
  initBackground();
  const greeting = await initGreeting();
  initClock(() => greeting.refresh());
  initTodos();
});
