// A small local set of outline icons (original artwork, Lucide-style:
// rounded caps/joins, 1.75px stroke), built with SVG DOM APIs so nothing is
// ever injected via innerHTML. No icon font, no CDN. New icons get added
// here as the UI needs them.

const NS = "http://www.w3.org/2000/svg";

function svg(children, { size = 20 } = {}) {
  const el = document.createElementNS(NS, "svg");
  el.setAttribute("viewBox", "0 0 24 24");
  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("stroke-width", "1.75");
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  el.setAttribute("aria-hidden", "true");
  el.classList.add("icon");
  for (const child of children) el.appendChild(child);
  return el;
}

function path(d) {
  const el = document.createElementNS(NS, "path");
  el.setAttribute("d", d);
  return el;
}

function circle(cx, cy, r) {
  const el = document.createElementNS(NS, "circle");
  el.setAttribute("cx", cx);
  el.setAttribute("cy", cy);
  el.setAttribute("r", r);
  return el;
}

function line(x1, y1, x2, y2) {
  const el = document.createElementNS(NS, "line");
  el.setAttribute("x1", x1);
  el.setAttribute("y1", y1);
  el.setAttribute("x2", x2);
  el.setAttribute("y2", y2);
  return el;
}

const CLOUD_D = "M6.5 19a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 16.6 8.03 4 4 0 0 1 16 16H6.5Z";

function sunRays() {
  return [
    circle(12, 12, 4),
    line(12, 2.5, 12, 4.5),
    line(12, 19.5, 12, 21.5),
    line(3.6, 12, 5.6, 12),
    line(18.4, 12, 20.4, 12),
    line(5.6, 5.6, 7, 7),
    line(17, 17, 18.4, 18.4),
    line(18.4, 5.6, 17, 7),
    line(7, 17, 5.6, 18.4),
  ];
}

function moonShape() {
  return [path("M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z")];
}

const BUILDERS = {
  "clear-day": () => svg(sunRays()),
  "clear-night": () => svg(moonShape()),
  "partly-cloudy-day": () =>
    svg([circle(8, 8, 3), line(8, 2, 8, 3.3), line(2.3, 8, 3.6, 8), line(4, 4, 4.9, 4.9), path(CLOUD_D)]),
  "partly-cloudy-night": () =>
    svg([path("M9.5 9.2A4.6 4.6 0 0 1 15 4.3a4.6 4.6 0 0 0-1.2 8.9 4.6 4.6 0 0 1-4.3-4Z"), path(CLOUD_D)]),
  cloudy: () => svg([path(CLOUD_D)]),
  fog: () =>
    svg([
      path("M6.5 14.5a4.5 4.5 0 0 1-.2-9A5.5 5.5 0 0 1 16.3 6.4 4 4 0 0 1 17 14"),
      line(4, 18, 20, 18),
      line(6, 21, 18, 21),
    ]),
  drizzle: () =>
    svg([path(CLOUD_D.replace("19", "14")), line(8, 17, 7, 19.5), line(12, 17, 11, 19.5), line(16, 17, 15, 19.5)]),
  rain: () =>
    svg([path(CLOUD_D.replace("19", "14")), line(8, 17, 6.5, 21), line(12, 17, 10.5, 21), line(16, 17, 14.5, 21)]),
  snow: () =>
    svg([
      path(CLOUD_D.replace("19", "14")),
      circle(8, 19, 0.5),
      circle(12, 19, 0.5),
      circle(16, 19, 0.5),
      circle(10, 21.5, 0.5),
      circle(14, 21.5, 0.5),
    ]),
  thunderstorm: () => svg([path(CLOUD_D.replace("19", "13")), path("M12.5 13 10 18h3l-1.5 4 4.5-6h-3l1.5-3Z")]),
  "map-pin": () => svg([path("M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"), circle(12, 9, 2.3)]),
  "chevron-down": () => svg([path("M6 9.5 12 15.5 18 9.5")]),
  gear: () =>
    svg([
      circle(12, 12, 3.2),
      path(
        "M19.4 13.5a1.8 1.8 0 0 0 .36 2l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V20a2 2 0 1 1-4 0v-.06a1.8 1.8 0 0 0-1.18-1.65 1.8 1.8 0 0 0-2 .36l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.1H4a2 2 0 1 1 0-4h.06A1.8 1.8 0 0 0 5.7 9.5a1.8 1.8 0 0 0-.36-2l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04a1.8 1.8 0 0 0 2 .36H10.3A1.8 1.8 0 0 0 11.4 3.4V3.3a2 2 0 1 1 4 0v.06a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04a1.8 1.8 0 0 0-.36 2v.06a1.8 1.8 0 0 0 1.65 1.1h.06a2 2 0 1 1 0 4h-.06a1.8 1.8 0 0 0-1.65 1.1Z"
      ),
    ]),
  pencil: () =>
    svg([
      path("M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4Z"),
      line(13.5, 7, 17, 10.5),
    ]),
  trash: () =>
    svg([
      path("M5 7h14"),
      path("M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"),
      path("M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"),
      line(10, 11, 10, 17),
      line(14, 11, 14, 17),
    ]),
  x: () => svg([line(6, 6, 18, 18), line(18, 6, 6, 18)]),
  check: () => svg([path("M5 12.5 9.5 17 19 6.5")]),
  plus: () => svg([line(12, 5, 12, 19), line(5, 12, 19, 12)]),
  search: () => svg([circle(11, 11, 6.5), line(20, 20, 15.8, 15.8)]),
  pin: () =>
    svg([
      path("M12 2.5c-2.8 0-5 2.2-5 5 0 3.7 5 11 5 11s5-7.3 5-11c0-2.8-2.2-5-5-5Z"),
      circle(12, 7.5, 1.8),
    ]),
  image: () =>
    svg([
      path("M4 5.5h16a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"),
      circle(8.3, 10, 1.6),
      path("M3 16.5l5.5-5 4 3.5L17 10.5l4 4.5"),
    ]),
  play: () => svg([path("M7 5.5v13l11-6.5Z")]),
  pause: () => svg([path("M7.5 5.5h3v13h-3Z"), path("M13.5 5.5h3v13h-3Z")]),
  "rotate-ccw": () =>
    svg([path("M4 12a8 8 0 1 1 2.6 5.9"), path("M4 6.5v5.5h5.5")]),
  "skip-forward": () => svg([path("M6 5.5v13l9-6.5Z"), line(18, 5.5, 18, 18.5)]),
  "chevron-up": () => svg([path("M6 14.5 12 8.5 18 14.5")]),
  expand: () =>
    svg([
      path("M9 3.5H5.5a2 2 0 0 0-2 2V9"),
      path("M15 3.5h3.5a2 2 0 0 1 2 2V9"),
      path("M9 20.5H5.5a2 2 0 0 1-2-2V15"),
      path("M15 20.5h3.5a2 2 0 0 0 2-2V15"),
    ]),
  minimize: () =>
    svg([
      path("M4 9h3.5a2 2 0 0 0 2-2V3.5"),
      path("M20 9h-3.5a2 2 0 0 1-2-2V3.5"),
      path("M4 15h3.5a2 2 0 0 1 2 2V20.5"),
      path("M20 15h-3.5a2 2 0 0 0-2 2V20.5"),
    ]),
};

// Returns a detached <svg> element for the given icon name. Falls back to a
// plain circle outline if the name is unknown, so a typo never breaks a
// render pass.
export function createIcon(name, { size = 20 } = {}) {
  const build = BUILDERS[name] || (() => svg([circle(12, 12, 8)]));
  const el = build();
  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  return el;
}

export const WEATHER_ICON_NAMES = [
  "clear-day",
  "clear-night",
  "partly-cloudy-day",
  "partly-cloudy-night",
  "cloudy",
  "fog",
  "drizzle",
  "rain",
  "snow",
  "thunderstorm",
];
