import { initClock } from "./js/clock.js";
import { initGreeting } from "./js/greeting.js";

document.addEventListener("DOMContentLoaded", async () => {
  const greeting = await initGreeting();
  initClock(() => greeting.refresh());
});
