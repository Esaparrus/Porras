import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiFootballSyncResult } from "@/lib/api-football";
import { syncLeagueGoalTotalsFromMatchScorers } from "@/lib/goal-totals";
import { generateKnockoutFromResults } from "@/lib/world-cup";
import { recalculateAllLeagueScores } from "@/app/actions";

// Adaptador para football-data.org (plan gratis cubre el Mundial 2026). Solo
// trae RESULTADOS: los goleadores no estan en el plan gratis, asi que esos
// siguen siendo manuales. Empareja por el codigo FIFA de 3 letras (tla), que
// football-data incluye en cada equipo, evitando el lio de idiomas.

type SyncableTeam = { id: string; short_name: string };

type SyncableMatch = {
  id: string;
  match_number: number | null;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
  match_date: string | null;
  is_finished: boolean;
  home_team?: SyncableTeam | SyncableTeam[] | null;
  away_team?: SyncableTeam | SyncableTeam[] | null;
};

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { tla: string | null; name: string };
  awayTeam: { tla: string | null; name: string };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
};

type FootballDataScorer = {
  player: { name: string | null };
  team: { tla: string | null };
  goals: number | null;
};

type PickedPlayer = {
  id: string;
  name: string;
  api_goals: number | null;
  teams?: { short_name: string } | { short_name: string }[] | null;
};

const FINISHED_STATUS = new Set(["FINISHED", "AWARDED"]);
const GROUP_DELAY_MINUTES = numberFromEnv("API_FOOTBALL_GROUP_DELAY_MINUTES", 150);
const KNOCKOUT_DELAY_MINUTES = numberFromEnv("API_FOOTBALL_KNOCKOUT_DELAY_MINUTES", 210);
const MAX_LOOKBACK_MINUTES = numberFromEnv("API_FOOTBALL_LOOKBACK_MINUTES", 12 * 60);

function numberFromEnv(key: string, fallback: number) {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  const baseUrl = (process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4").replace(
    /\/$/,
    "",
  );
  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  if (!token) throw new Error("Falta FOOTBALL_DATA_TOKEN.");
  return { token, baseUrl, competition };
}

function getTeam(row: SyncableTeam | SyncableTeam[] | null | undefined) {
  if (Array.isArray(row)) return row[0] ?? null;
  return row ?? null;
}

function matchDelayMinutes(stage: string) {
  return stage === "group" ? GROUP_DELAY_MINUTES : KNOCKOUT_DELAY_MINUTES;
}

// Ventana activa: el partido ya empezo hace el margen y sigue dentro del limite.
// Ignora is_finished (sirve tambien para refrescar goleadores tras cerrar).
function isInActiveWindow(match: SyncableMatch, now: Date) {
  if (!match.match_date) return false;
  const minutesSinceStart = (now.getTime() - new Date(match.match_date).getTime()) / 60_000;
  return (
    minutesSinceStart >= matchDelayMinutes(match.stage) &&
    minutesSinceStart <= MAX_LOOKBACK_MINUTES
  );
}

function isCandidate(match: SyncableMatch, now: Date) {
  return !match.is_finished && isInActiveWindow(match, now);
}

function normalize(value: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function nameTokens(value: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

// Empareja un nombre contra candidatos {name}. Si hay ambiguedad devuelve null.
function matchByName<T extends { name: string }>(candidates: T[], name: string): T | null {
  const target = normalize(name);
  const exact = candidates.filter((c) => normalize(c.name) === target);
  if (exact.length === 1) return exact[0];

  const tk = nameTokens(name);
  const surname = tk[tk.length - 1];
  if (!surname) return null;

  const bySurname = candidates.filter((c) => {
    const t = nameTokens(c.name);
    return t[t.length - 1] === surname;
  });
  if (bySurname.length === 1) return bySurname[0];

  if (bySurname.length > 1 && tk.length > 1) {
    const first = tk[0];
    const narrowed = bySurname.filter((c) =>
      nameTokens(c.name).some((t) => t === first || t[0] === first[0]),
    );
    if (narrowed.length === 1) return narrowed[0];
  }
  return null;
}

function getShortName(player: PickedPlayer) {
  const team = Array.isArray(player.teams) ? player.teams[0] : player.teams;
  return team?.short_name ?? null;
}

async function fetchCompetitionMatches() {
  const { token, baseUrl, competition } = getConfig();
  const response = await fetch(`${baseUrl}/competitions/${competition}/matches`, {
    cache: "no-store",
    headers: { "X-Auth-Token": token },
  });

  if (!response.ok) {
    throw new Error(`football-data respondio ${response.status}.`);
  }

  const payload = (await response.json()) as { matches?: FootballDataMatch[] };
  return payload.matches ?? [];
}

async function fetchScorers() {
  const { token, baseUrl, competition } = getConfig();
  const response = await fetch(`${baseUrl}/competitions/${competition}/scorers?limit=100`, {
    cache: "no-store",
    headers: { "X-Auth-Token": token },
  });

  if (!response.ok) {
    throw new Error(`football-data goleadores respondio ${response.status}.`);
  }

  const payload = (await response.json()) as { scorers?: FootballDataScorer[] };
  return payload.scorers ?? [];
}

// Actualiza el total de goles (players.api_goals) de los jugadores que la gente
// ha apostado. Solo toca los que encuentra en el ranking; nunca pone a 0 a uno
// que no aparezca (el plan gratis puede recortar la lista). Devuelve cuantos
// totales cambiaron.
// Actualiza el total de goles (players.api_goals) solo de los jugadores que
// alguien ha apostado como goleadores, emparejando por tla + nombre. Solo toca
// los que encuentra en el ranking; nunca pone a 0 a uno que no aparezca (el plan
// gratis puede recortar la lista). Devuelve cuantos totales cambiaron.
async function syncScorerTotals(supabase: SupabaseClient, messages: string[]): Promise<number> {
  const { data: predRows } = await supabase.from("scorer_predictions").select("player_id");
  const pickedIds = Array.from(new Set((predRows ?? []).map((row) => row.player_id as string)));
  if (!pickedIds.length) {
    messages.push("Goleadores: nadie ha apostado goleadores todavia.");
    return 0;
  }

  const { data: playerRows } = await supabase
    .from("players")
    .select("id, name, api_goals, teams(short_name)")
    .in("id", pickedIds);

  const players = (playerRows ?? []) as PickedPlayer[];

  let scorers: FootballDataScorer[];
  try {
    scorers = await fetchScorers();
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    messages.push(`No se pudieron leer goleadores: ${message}.`);
    return 0;
  }

  let changed = 0;
  for (const player of players) {
    const tla = getShortName(player);
    if (!tla) continue;

    const candidates = scorers
      .filter((scorer) => scorer.team.tla === tla && scorer.player.name)
      .map((scorer) => ({ name: scorer.player.name as string, goals: scorer.goals ?? 0 }));

    const matched = matchByName(candidates, player.name);
    if (!matched) continue;
    if ((player.api_goals ?? -1) === matched.goals) continue;

    const { error } = await supabase
      .from("players")
      .update({ api_goals: matched.goals })
      .eq("id", player.id);

    if (!error) {
      changed += 1;
      messages.push(`Goleador ${player.name}: ${matched.goals} goles.`);
    }
  }

  messages.push(
    `Goleadores: ${pickedIds.length} apostados, ${scorers.length} en ranking, ${changed} actualizados.`,
  );
  return changed;
}

// Empareja por TLA (codigo FIFA) sin importar el orden: football-data puede
// listar local/visitante al reves que nosotros. `swapped` indica que su local
// es nuestro visitante, para orientar marcador y ganador.
type FootballDataFixtureMatch = { fixture: FootballDataMatch; swapped: boolean };

function findMatch(
  match: SyncableMatch,
  fixtures: FootballDataMatch[],
): FootballDataFixtureMatch | null {
  const homeTeam = getTeam(match.home_team);
  const awayTeam = getTeam(match.away_team);
  if (!homeTeam || !awayTeam) return null;

  const direct = fixtures.find(
    (fixture) =>
      fixture.homeTeam.tla === homeTeam.short_name &&
      fixture.awayTeam.tla === awayTeam.short_name,
  );
  if (direct) return { fixture: direct, swapped: false };

  const reversed = fixtures.find(
    (fixture) =>
      fixture.homeTeam.tla === awayTeam.short_name &&
      fixture.awayTeam.tla === homeTeam.short_name,
  );
  if (reversed) return { fixture: reversed, swapped: true };

  return null;
}

function getWinnerTeamId(
  match: SyncableMatch,
  fixture: FootballDataMatch,
  swapped: boolean,
) {
  // El local de football-data es nuestro local salvo que el orden este invertido.
  const apiHomeTeamId = swapped ? match.away_team_id : match.home_team_id;
  const apiAwayTeamId = swapped ? match.home_team_id : match.away_team_id;
  if (fixture.score.winner === "HOME_TEAM") return apiHomeTeamId;
  if (fixture.score.winner === "AWAY_TEAM") return apiAwayTeamId;
  return null;
}

async function writeSyncLog(
  supabase: SupabaseClient,
  source: string,
  result: ApiFootballSyncResult,
  error: string | null,
) {
  await supabase
    .from("api_football_sync_logs")
    .insert({
      source: `${source}:football-data`,
      ok: result.ok && !error,
      checked: result.checked,
      updated: result.updated,
      skipped: result.skipped,
      suggestions: 0,
      messages: result.messages.slice(0, 50),
      error,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

export async function syncFinishedResultsFromFootballData(
  supabase: SupabaseClient,
  options: { now?: Date; source?: string } = {},
): Promise<ApiFootballSyncResult> {
  const now = options.now ?? new Date();
  const source = options.source ?? "cron";
  const messages: string[] = [];

  try {
    const result = await runSync(supabase, now, messages);
    await writeSyncLog(supabase, source, result, null);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await writeSyncLog(
      supabase,
      source,
      { ok: false, checked: 0, updated: 0, skipped: 0, suggestions: 0, scorersApplied: 0, messages },
      message,
    );
    throw error;
  }
}

async function runSync(
  supabase: SupabaseClient,
  now: Date,
  messages: string[],
): Promise<ApiFootballSyncResult> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, match_number, stage, home_team_id, away_team_id, match_date, is_finished, home_team:teams!matches_home_team_id_fkey(id, short_name), away_team:teams!matches_away_team_id_fkey(id, short_name)",
    )
    .order("match_date", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`No se pudieron leer partidos: ${error.message}`);
  }

  const allMatches = (data ?? []) as SyncableMatch[];
  const inWindow = allMatches.filter((match) => isInActiveWindow(match, now));

  // Sin partidos en ventana no gastamos ninguna peticion.
  if (!inWindow.length) {
    return {
      ok: true,
      checked: 0,
      skipped: 0,
      updated: 0,
      suggestions: 0,
      scorersApplied: 0,
      messages: ["No hay partidos en ventana para sincronizar."],
    };
  }

  const candidates = inWindow.filter((match) => !match.is_finished);

  let checked = 0;
  let updated = 0;
  let skipped = 0;

  // Resultados: solo si hay partidos sin cerrar.
  const fixtures = candidates.length ? await fetchCompetitionMatches() : [];

  for (const match of candidates) {
    checked += 1;
    const found = findMatch(match, fixtures);

    if (!found) {
      skipped += 1;
      messages.push(`Sin equivalencia en football-data para partido ${match.match_number ?? match.id}.`);
      continue;
    }
    const { fixture, swapped } = found;

    if (!FINISHED_STATUS.has(fixture.status)) {
      skipped += 1;
      messages.push(
        `Partido ${match.match_number ?? match.id} aun no finalizado (${fixture.status}).`,
      );
      continue;
    }

    if (fixture.score.fullTime.home == null || fixture.score.fullTime.away == null) {
      skipped += 1;
      messages.push(`Partido ${match.match_number ?? match.id} finalizado sin marcador util.`);
      continue;
    }

    // Orientamos el marcador a nuestro orden local/visitante.
    const homeScore = swapped ? fixture.score.fullTime.away : fixture.score.fullTime.home;
    const awayScore = swapped ? fixture.score.fullTime.home : fixture.score.fullTime.away;

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        away_score: awayScore,
        home_score: homeScore,
        is_finished: true,
        winner_team_id: getWinnerTeamId(match, fixture, swapped),
      })
      .eq("id", match.id)
      .eq("is_finished", false);

    if (updateError) {
      skipped += 1;
      messages.push(
        `No se pudo actualizar partido ${match.match_number ?? match.id}: ${updateError.message}`,
      );
      continue;
    }

    updated += 1;
    messages.push(
      `Actualizado partido ${match.match_number ?? match.id}: ${homeScore}-${awayScore}.`,
    );
  }

  // Goleadores: refrescamos totales mientras haya partidos en ventana (el plan
  // gratis publica los goles con algo de retraso, asi que conviene reintentar).
  const scorersApplied = await syncScorerTotals(supabase, messages);

  if (updated > 0) {
    await generateKnockoutFromResults(supabase);
  }
  if (scorersApplied > 0) {
    await syncLeagueGoalTotalsFromMatchScorers(supabase);
  }
  if (updated > 0 || scorersApplied > 0) {
    await recalculateAllLeagueScores();
  }

  return { ok: true, checked, skipped, updated, suggestions: 0, scorersApplied, messages };
}
