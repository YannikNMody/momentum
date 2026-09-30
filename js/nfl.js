// All ESPN NFL scoreboard fetching and parsing lives here, so the data
// source is easy to swap later if the API changes. Uses ESPN's public,
// unofficial, keyless scoreboard endpoint. Every field read from the
// response is validated defensively - a malformed or unexpected shape
// results in null/empty results rather than a thrown error.

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN request failed: ${res.status}`);
  return res.json();
}

function isCompleted(event) {
  return Boolean(event?.competitions?.[0]?.status?.type?.completed);
}

function parseTeam(competitor) {
  const team = competitor?.team;
  return {
    abbreviation: typeof team?.abbreviation === "string" ? team.abbreviation : "?",
    displayName: typeof team?.displayName === "string" ? team.displayName : "Unknown",
    color: typeof team?.color === "string" && team.color ? `#${team.color}` : "#666666",
    score: typeof competitor?.score === "string" ? competitor.score : "0",
    winner: Boolean(competitor?.winner),
  };
}

function parseGame(event) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors;
  if (!Array.isArray(competitors) || competitors.length !== 2) return null;

  const home = competitors.find((c) => c?.homeAway === "home");
  const away = competitors.find((c) => c?.homeAway === "away");
  if (!home || !away) return null;

  return {
    id: typeof event.id === "string" || typeof event.id === "number" ? String(event.id) : null,
    completed: isCompleted(event),
    home: parseTeam(home),
    away: parseTeam(away),
  };
}

function parseScoreboard(raw) {
  if (!raw || typeof raw !== "object") return null;

  const weekNumber = raw.week?.number;
  const events = Array.isArray(raw.events) ? raw.events : [];
  const games = events.map(parseGame).filter(Boolean);

  if (typeof weekNumber !== "number" || games.length === 0) return null;

  return { week: weekNumber, games };
}

async function fetchWeek(week) {
  const url = typeof week === "number" ? `${BASE_URL}?seasontype=2&week=${week}` : BASE_URL;
  const raw = await fetchJson(url);
  return parseScoreboard(raw);
}

// Returns { week, games } for the most recently completed week: the current
// scoreboard if every one of its games is final, otherwise the previous week.
export async function fetchLatestCompletedWeek() {
  const current = await fetchWeek();
  if (!current) return null;

  const allFinal = current.games.every((g) => g.completed);
  if (allFinal || current.week <= 1) return current;

  const previous = await fetchWeek(current.week - 1);
  return previous || current;
}

// Builds a de-duplicated, sorted list of teams appearing in a set of games,
// used to populate the favorite-team dropdown.
export function extractTeams(games) {
  const teams = new Map();
  for (const game of games || []) {
    for (const team of [game.home, game.away]) {
      if (team && !teams.has(team.abbreviation)) teams.set(team.abbreviation, team);
    }
  }
  return [...teams.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
