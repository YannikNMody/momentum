import { initBackground } from "./js/background.js";
import { initClock } from "./js/clock.js";
import { initDistractionFree } from "./js/distraction-free.js";
import { initFocus } from "./js/focus.js";
import { initGreeting } from "./js/greeting.js";
import { initNflWidget } from "./js/nfl-widget.js";
import { initTimer } from "./js/timer.js";
import { initTodos } from "./js/todos.js";
import { initWeatherWidget } from "./js/weather-widget.js";

document.addEventListener("DOMContentLoaded", async () => {
  initBackground();
  const greeting = await initGreeting();
  initClock(() => greeting.refresh());
  initTodos();
  initFocus();
  initTimer();
  initDistractionFree();
  initNflWidget();
  initWeatherWidget();
});
