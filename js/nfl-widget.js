// NFL scores widget UI: caches the ESPN response in chrome.storage.local
// (refetched at most every 3 hours), remembers a favorite team in
// chrome.storage.sync to pin/highlight that game, and fails soft - on any
// error it falls back to cached data with a "last updated" note, or hides
// the panel quietly if there's nothing to show.

import { fetchLatestCompletedWeek, extractTeams } from "./nfl.js";
import { storage } from "./storage.js";

const CACHE_KEY = "nflScoreboard";
const FAVORITE_KEY = "nflFavoriteTeam";
const REFRESH_MS = 3 * 60 * 60 * 1000;

function formatUpdated(fetchedAt) {
  if (!fetchedAt) return "";
  const date = new Date(fetchedAt);
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
  return `Last updated ${time}`;
}

export async function initNflWidget() {
  const panelEl = document.getElementById("nfl-panel");
  const toggleBtn = document.getElementById("nfl-toggle");
  const bodyEl = document.getElementById("nfl-body");
  const titleEl = document.getElementById("nfl-title");
  const listEl = document.getElementById("nfl-game-list");
  const updatedEl = document.getElementById("nfl-updated");
  const favoriteSelect = document.getElementById("nfl-favorite-select");

  if (!panelEl) return;

  toggleBtn.addEventListener("click", () => {
    const collapsed = bodyEl.classList.toggle("collapsed");
    toggleBtn.setAttribute("aria-expanded", String(!collapsed));
  });

  let favorite = (await storage.sync.get(FAVORITE_KEY))[FAVORITE_KEY] || "";
  let cached = (await storage.local.get(CACHE_KEY))[CACHE_KEY] || null;

  favoriteSelect.addEventListener("change", async () => {
    favorite = favoriteSelect.value;
    await storage.sync.set({ [FAVORITE_KEY]: favorite });
    render();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes[FAVORITE_KEY]) {
      favorite = changes[FAVORITE_KEY].newValue || "";
      favoriteSelect.value = favorite;
      render();
    }
    if (areaName === "local" && changes[CACHE_KEY]) {
      cached = changes[CACHE_KEY].newValue || null;
      render();
    }
  });

  const isFresh = cached && typeof cached.fetchedAt === "number" && Date.now() - cached.fetchedAt < REFRESH_MS;

  if (!isFresh) {
    try {
      const latest = await fetchLatestCompletedWeek();
      if (latest) {
        cached = { week: latest.week, games: latest.games, fetchedAt: Date.now() };
        await storage.local.set({ [CACHE_KEY]: cached });
      }
    } catch {
      // Network/API failure: fall back to whatever is already cached below.
    }
  }

  render();

  function populateFavoriteOptions(games) {
    const teams = extractTeams(games);
    const previousValue = favoriteSelect.value;
    favoriteSelect.textContent = "";

    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "No favorite";
    favoriteSelect.appendChild(noneOption);

    for (const team of teams) {
      const option = document.createElement("option");
      option.value = team.abbreviation;
      option.textContent = team.displayName;
      favoriteSelect.appendChild(option);
    }

    favoriteSelect.value = favorite || previousValue || "";
  }

  function renderGameRow(game) {
    const li = document.createElement("li");
    li.className = "nfl-game";

    const isFavorite = favorite && (game.home.abbreviation === favorite || game.away.abbreviation === favorite);
    if (isFavorite) li.classList.add("nfl-game-pinned");

    const away = document.createElement("span");
    away.className = "nfl-team";
    if (game.away.winner) away.classList.add("nfl-winner");
    const awayChip = document.createElement("span");
    awayChip.className = "nfl-chip";
    awayChip.style.backgroundColor = game.away.color;
    away.appendChild(awayChip);
    away.appendChild(document.createTextNode(`${game.away.abbreviation} ${game.away.score}`));

    const at = document.createElement("span");
    at.className = "nfl-at";
    at.textContent = "@";

    const home = document.createElement("span");
    home.className = "nfl-team";
    if (game.home.winner) home.classList.add("nfl-winner");
    const homeChip = document.createElement("span");
    homeChip.className = "nfl-chip";
    homeChip.style.backgroundColor = game.home.color;
    home.appendChild(homeChip);
    home.appendChild(document.createTextNode(`${game.home.abbreviation} ${game.home.score}`));

    li.append(away, at, home);
    return li;
  }

  function render() {
    if (!cached || !Array.isArray(cached.games) || cached.games.length === 0) {
      panelEl.hidden = true;
      return;
    }

    panelEl.hidden = false;
    titleEl.textContent = `Week ${cached.week} results`;

    populateFavoriteOptions(cached.games);

    const games = [...cached.games].sort((a, b) => {
      const aFav = favorite && (a.home.abbreviation === favorite || a.away.abbreviation === favorite) ? 1 : 0;
      const bFav = favorite && (b.home.abbreviation === favorite || b.away.abbreviation === favorite) ? 1 : 0;
      return bFav - aFav;
    });

    listEl.textContent = "";
    for (const game of games) {
      listEl.appendChild(renderGameRow(game));
    }

    updatedEl.textContent = formatUpdated(cached.fetchedAt);
  }
}
