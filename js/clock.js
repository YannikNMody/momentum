// Renders the clock and date, ticking on minute boundaries and re-rendering
// when the tab regains visibility (Chrome throttles timers in the background).

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function msUntilNextMinute() {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

export function initClock(onRender) {
  const clockEl = document.getElementById("clock");
  const dateEl = document.getElementById("date");

  let timeoutId = null;
  let intervalId = null;

  function clearTimers() {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
    timeoutId = null;
    intervalId = null;
  }

  function render() {
    const now = new Date();
    clockEl.textContent = timeFormatter.format(now);
    dateEl.textContent = dateFormatter.format(now);
    if (onRender) onRender();
  }

  function scheduleTicks() {
    clearTimers();
    timeoutId = setTimeout(() => {
      render();
      intervalId = setInterval(render, 60000);
    }, msUntilNextMinute());
  }

  render();
  scheduleTicks();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      render();
      scheduleTicks();
    }
  });
}
