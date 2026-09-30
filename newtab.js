function getGreeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function updateClock() {
  const now = new Date();
  const clockEl = document.getElementById("clock");
  const greetingEl = document.getElementById("greeting");

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  clockEl.textContent = `${hours}:${minutes}`;
  greetingEl.textContent = getGreeting(now.getHours());
}

document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);
});
