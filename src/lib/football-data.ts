import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiFootballSyncResult } from "@/lib/api-football";
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

function isCandidate(match: SyncableMatch, now: Date) {
  if (match.is_finished || !match.match_date) return false;
  const minutesSinceStart = (now.getTime() - new Date(match.match_date).getTime()) / 60_000;
  return (
    minutesSinceStart >= matchDelayMinutes(match.stage) &&
    minutesSinceStart <= MAX_LOOKBACK_MINUTES
  );
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

function findMatch(match: SyncableMatch, fixtures: FootballDataMatch[]) {
  const homeTeam = getTeam(match.home_team);
  const awayTeam = getTeam(match.away_team);
  if (!homeTeam || !awayTeam) return null;

  return (
    fixtures.find(
      (fixture) =>
        fixture.homeTeam.tla === homeTeam.short_name &&
        fixture.awayTeam.tla === awayTeam.short_name,
    ) ?? null
  );
}

function getWinnerTeamId(match: SyncableMatch, fixture: FootballDataMatch) {
  if (fixture.score.winner === "HOME_TEAM") return match.home_team_id;
  if (fixture.score.winner === "AWAY_TEAM") return match.away_team_id;
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

  const candidates = ((data ?? []) as SyncableMatch[]).filter((match) => isCandidate(match, now));

  if (!candidates.length) {
    return {
      ok: true,
      checked: 0,
      skipped: 0,
      updated: 0,
      suggestions: 0,
      scorersApplied: 0,
      messages: ["No hay partidos candidatos para sincronizar."],
    };
  }

  // Una sola llamada trae todos los partidos de la competicion.
  const fixtures = await fetchCompetitionMatches();

  let checked = 0;
  let updated = 0;
  let skipped = 0;

  for (const match of candidates) {
    checked += 1;
    const fixture = findMatch(match, fixtures);

    if (!fixture) {
      skipped += 1;
      messages.push(`Sin equivalencia en football-data para partido ${match.match_number ?? match.id}.`);
      continue;
    }

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

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        away_score: fixture.score.fullTime.away,
        home_score: fixture.score.fullTime.home,
        is_finished: true,
        winner_team_id: getWinnerTeamId(match, fixture),
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
      `Actualizado partido ${match.match_number ?? match.id}: ${fixture.score.fullTime.home}-${fixture.score.fullTime.away}.`,
    );
  }

  if (updated > 0) {
    await generateKnockoutFromResults(supabase);
    await recalculateAllLeagueScores();
  }

  return { ok: true, checked, skipped, updated, suggestions: 0, scorersApplied: 0, messages };
}
