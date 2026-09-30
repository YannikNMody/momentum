import { initBackground } from "./js/background.js";
import { initClock } from "./js/clock.js";
import { initDistractionFree } from "./js/distraction-free.js";
import { initFocus } from "./js/focus.js";
import { initGreeting } from "./js/greeting.js";
import { createIcon } from "./js/icons.js";
import { initNflWidget } from "./js/nfl-widget.js";
import { initSettings } from "./js/settings.js";
import { initTimer } from "./js/timer.js";
import { initTodos } from "./js/todos.js";
import { initWeatherWidget } from "./js/weather-widget.js";

// Fills in any [data-icon="name"] placeholder elements left in the static
// markup (panel-collapse chevrons, etc.) with the matching local SVG icon.
function fillStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.appendChild(createIcon(el.dataset.icon, { size: 16 }));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  fillStaticIcons();
  initBackground();
  const greeting = await initGreeting();
  initClock(() => greeting.refresh());
  initTodos();
  initFocus();
  initTimer();
  initDistractionFree();
  initNflWidget();
  initWeatherWidget();
  initSettings();
});
