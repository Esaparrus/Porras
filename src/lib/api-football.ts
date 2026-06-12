import type { SupabaseClient } from "@supabase/supabase-js";
import { generateKnockoutFromResults } from "@/lib/world-cup";
import { recalculateAllLeagueScores } from "@/app/actions";

type SyncableMatch = {
  id: string;
  match_number: number | null;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
  match_date: string | null;
  is_finished: boolean;
  api_football_fixture_id?: number | null;
  home_team?: SyncableTeam | SyncableTeam[] | null;
  away_team?: SyncableTeam | SyncableTeam[] | null;
};

type SyncableTeam = {
  id: string;
  name: string;
  short_name: string;
  api_football_team_id?: number | null;
};

type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    penalty?: {
      home: number | null;
      away: number | null;
    };
  };
};

type ApiFootballEvent = {
  team: { id: number; name: string };
  player: { id: number | null; name: string | null };
  type: string;
  detail: string;
};

export type ApiFootballSyncResult = {
  ok: boolean;
  checked: number;
  updated: number;
  skipped: number;
  suggestions: number;
  messages: string[];
};

const FINISHED_STATUS = new Set(["FT", "AET", "PEN"]);

// Margenes configurables por entorno. Solo se mira un partido cuando ya ha
// pasado ese tiempo desde el inicio, para no consultar la API en vano.
const GROUP_DELAY_MINUTES = numberFromEnv("API_FOOTBALL_GROUP_DELAY_MINUTES", 150);
const KNOCKOUT_DELAY_MINUTES = numberFromEnv("API_FOOTBALL_KNOCKOUT_DELAY_MINUTES", 210);
// Ventana amplia (7 dias por defecto) para que una caida del cron no deje un
// partido finalizado sin sincronizar para siempre. El fallback manual sigue ahi.
const MAX_LOOKBACK_MINUTES = numberFromEnv("API_FOOTBALL_LOOKBACK_MINUTES", 7 * 24 * 60);

function numberFromEnv(key: string, fallback: number) {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getApiFootballConfig() {
  const apiKey = process.env.API_FOOTBALL_KEY ?? process.env.FOOTBALL_API_KEY;
  const baseUrl =
    process.env.API_FOOTBALL_BASE_URL ??
    process.env.FOOTBALL_API_BASE_URL ??
    "https://v3.football.api-sports.io";

  if (!apiKey) {
    throw new Error("Falta API_FOOTBALL_KEY o FOOTBALL_API_KEY.");
  }

  return { apiKey, baseUrl };
}

function getTeam(row: SyncableTeam | SyncableTeam[] | null | undefined) {
  if (Array.isArray(row)) return row[0] ?? null;
  return row ?? null;
}

function getSpainDateKey(value: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Madrid",
    year: "numeric",
  });

  return formatter.format(new Date(value));
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

// Tokens significativos del nombre (sin acentos, sin iniciales sueltas tipo "L.").
function nameTokens(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

// Empareja el goleador de la API con un jugador local del equipo correcto.
// Estrategia, de mas a menos fiable; si hay ambiguedad NO adivina (deja que el
// admin lo elija):
//   1. por api_football_player_id ya guardado
//   2. nombre normalizado exacto y unico
//   3. apellido (ultimo token) unico
//   4. apellido + inicial/nombre cuando el apellido se repite
function findLocalScorer(
  candidates: ScorerLookupPlayer[],
  apiName: string,
  apiId: number | null,
): ScorerLookupPlayer | null {
  if (apiId) {
    const byId = candidates.find((player) => player.api_football_player_id === apiId);
    if (byId) return byId;
  }

  const target = normalizeName(apiName);
  const exact = candidates.filter((player) => normalizeName(player.name) === target);
  if (exact.length === 1) return exact[0];

  const apiTokens = nameTokens(apiName);
  const apiSurname = apiTokens[apiTokens.length - 1];
  if (!apiSurname) return null;

  const bySurname = candidates.filter((player) => {
    const tokens = nameTokens(player.name);
    return tokens[tokens.length - 1] === apiSurname;
  });
  if (bySurname.length === 1) return bySurname[0];

  if (bySurname.length > 1 && apiTokens.length > 1) {
    const apiFirst = apiTokens[0];
    const narrowed = bySurname.filter((player) =>
      nameTokens(player.name).some(
        (token) => token === apiFirst || token[0] === apiFirst[0],
      ),
    );
    if (narrowed.length === 1) return narrowed[0];
  }

  return null;
}

function matchDelayMinutes(stage: string) {
  return stage === "group" ? GROUP_DELAY_MINUTES : KNOCKOUT_DELAY_MINUTES;
}

function isCandidate(match: SyncableMatch, now: Date) {
  if (match.is_finished || !match.match_date) return false;

  const minutesSinceStart =
    (now.getTime() - new Date(match.match_date).getTime()) / 60_000;

  return (
    minutesSinceStart >= matchDelayMinutes(match.stage) &&
    minutesSinceStart <= MAX_LOOKBACK_MINUTES
  );
}

async function fetchFixturesByDate(date: string) {
  const { apiKey, baseUrl } = getApiFootballConfig();
  const url = new URL("/fixtures", baseUrl);
  url.searchParams.set("league", "1");
  url.searchParams.set("season", "2026");
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", "Europe/Madrid");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football respondio ${response.status}.`);
  }

  const payload = (await response.json()) as { response?: ApiFootballFixture[] };
  return payload.response ?? [];
}

async function fetchFixtureEvents(fixtureId: number) {
  const { apiKey, baseUrl } = getApiFootballConfig();
  const url = new URL("/fixtures/events", baseUrl);
  url.searchParams.set("fixture", String(fixtureId));

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "x-apisports-key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`API-Football eventos respondio ${response.status}.`);
  }

  const payload = (await response.json()) as { response?: ApiFootballEvent[] };
  return payload.response ?? [];
}

type ScorerLookupPlayer = {
  id: string;
  name: string;
  team_id: string;
  api_football_player_id?: number | null;
};

type ScorerSuggestionDraft = {
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  api_player_id: number | null;
  api_player_name: string;
  goals: number;
  is_own_goal: boolean;
};

// Convierte los eventos de gol de la API en sugerencias. No escribe goles:
// solo deja propuestas para que el admin confirme (los autogoles no puntuan a
// ningun goleador, asi que se marcan pero quedan sin jugador asignado).
function buildScorerSuggestions(
  matchId: string,
  events: ApiFootballEvent[],
  teamIdByApiTeamId: Map<number, string>,
  playersByTeamId: Map<string, ScorerLookupPlayer[]>,
): ScorerSuggestionDraft[] {
  const drafts = new Map<string, ScorerSuggestionDraft>();

  for (const event of events) {
    if (event.type !== "Goal") continue;
    if (event.detail === "Missed Penalty") continue;
    const isOwnGoal = event.detail === "Own Goal";
    const apiPlayerName = event.player?.name?.trim();
    if (!apiPlayerName) continue;

    const localTeamId = teamIdByApiTeamId.get(event.team.id) ?? null;
    const key = `${apiPlayerName}::${isOwnGoal ? "og" : "g"}`;
    const existing = drafts.get(key);
    if (existing) {
      existing.goals += 1;
      continue;
    }

    let playerId: string | null = null;
    if (!isOwnGoal && localTeamId) {
      const candidates = playersByTeamId.get(localTeamId) ?? [];
      const matched = findLocalScorer(candidates, apiPlayerName, event.player.id ?? null);
      playerId = matched?.id ?? null;
    }

    drafts.set(key, {
      match_id: matchId,
      team_id: localTeamId,
      player_id: playerId,
      api_player_id: event.player.id ?? null,
      api_player_name: apiPlayerName,
      goals: 1,
      is_own_goal: isOwnGoal,
    });
  }

  return Array.from(drafts.values());
}

function findFixture(match: SyncableMatch, fixtures: ApiFootballFixture[]) {
  if (match.api_football_fixture_id) {
    return (
      fixtures.find(
        (fixture) => fixture.fixture.id === match.api_football_fixture_id,
      ) ?? null
    );
  }

  const homeTeam = getTeam(match.home_team);
  const awayTeam = getTeam(match.away_team);
  if (!homeTeam || !awayTeam) return null;

  const byApiTeamIds = fixtures.find(
    (fixture) =>
      homeTeam.api_football_team_id === fixture.teams.home.id &&
      awayTeam.api_football_team_id === fixture.teams.away.id,
  );
  if (byApiTeamIds) return byApiTeamIds;

  const homeNames = [homeTeam.name, homeTeam.short_name].map(normalizeName);
  const awayNames = [awayTeam.name, awayTeam.short_name].map(normalizeName);

  return (
    fixtures.find(
      (fixture) =>
        homeNames.includes(normalizeName(fixture.teams.home.name)) &&
        awayNames.includes(normalizeName(fixture.teams.away.name)),
    ) ?? null
  );
}

function getWinnerTeamId(match: SyncableMatch, fixture: ApiFootballFixture) {
  if (fixture.teams.home.winner) return match.home_team_id;
  if (fixture.teams.away.winner) return match.away_team_id;

  if (
    fixture.fixture.status.short === "PEN" &&
    fixture.score.penalty?.home != null &&
    fixture.score.penalty.away != null
  ) {
    return fixture.score.penalty.home > fixture.score.penalty.away
      ? match.home_team_id
      : match.away_team_id;
  }

  if (fixture.goals.home != null && fixture.goals.away != null) {
    if (fixture.goals.home > fixture.goals.away) return match.home_team_id;
    if (fixture.goals.away > fixture.goals.home) return match.away_team_id;
  }

  return null;
}

export async function syncFinishedResultsFromApiFootball(
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
      { ok: false, checked: 0, updated: 0, skipped: 0, suggestions: 0, messages },
      message,
    );
    throw error;
  }
}

async function writeSyncLog(
  supabase: SupabaseClient,
  source: string,
  result: ApiFootballSyncResult,
  error: string | null,
) {
  // Best-effort: si la tabla de logs no existe aun, no rompemos el sync.
  await supabase
    .from("api_football_sync_logs")
    .insert({
      source,
      ok: result.ok && !error,
      checked: result.checked,
      updated: result.updated,
      skipped: result.skipped,
      suggestions: result.suggestions,
      messages: result.messages.slice(0, 50),
      error,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

async function runSync(
  supabase: SupabaseClient,
  now: Date,
  messages: string[],
): Promise<ApiFootballSyncResult> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, match_number, stage, home_team_id, away_team_id, match_date, is_finished, api_football_fixture_id, home_team:teams!matches_home_team_id_fkey(id, name, short_name, api_football_team_id), away_team:teams!matches_away_team_id_fkey(id, name, short_name, api_football_team_id)",
    )
    .order("match_date", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(
      `No se pudieron leer partidos. Comprueba la migracion de API-Football: ${error.message}`,
    );
  }

  const candidates = ((data ?? []) as SyncableMatch[]).filter((match) =>
    isCandidate(match, now),
  );

  if (!candidates.length) {
    return {
      ok: true,
      checked: 0,
      skipped: 0,
      updated: 0,
      suggestions: 0,
      messages: ["No hay partidos candidatos para sincronizar."],
    };
  }

  const byDate = candidates.reduce<Map<string, SyncableMatch[]>>((groups, match) => {
    const date = getSpainDateKey(match.match_date as string);
    groups.set(date, [...(groups.get(date) ?? []), match]);
    return groups;
  }, new Map());

  let checked = 0;
  let updated = 0;
  let skipped = 0;
  const updatedMatches: { match: SyncableMatch; fixture: ApiFootballFixture }[] = [];

  for (const [date, matches] of byDate) {
    const fixtures = await fetchFixturesByDate(date);

    for (const match of matches) {
      checked += 1;
      const fixture = findFixture(match, fixtures);
      if (!fixture) {
        skipped += 1;
        messages.push(
          `Sin equivalencia API para partido ${match.match_number ?? match.id}.`,
        );
        continue;
      }

      if (!FINISHED_STATUS.has(fixture.fixture.status.short)) {
        skipped += 1;
        messages.push(
          `Partido ${match.match_number ?? match.id} aun no finalizado (${fixture.fixture.status.short}).`,
        );
        continue;
      }

      if (fixture.goals.home == null || fixture.goals.away == null) {
        skipped += 1;
        messages.push(
          `Partido ${match.match_number ?? match.id} finalizado sin marcador util.`,
        );
        continue;
      }

      const homeTeam = getTeam(match.home_team);
      const awayTeam = getTeam(match.away_team);
      const winnerTeamId = getWinnerTeamId(match, fixture);
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          api_football_fixture_id: fixture.fixture.id,
          api_football_last_sync_at: now.toISOString(),
          away_score: fixture.goals.away,
          home_score: fixture.goals.home,
          is_finished: true,
          winner_team_id: winnerTeamId,
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

      await Promise.all([
        homeTeam
          ? supabase
              .from("teams")
              .update({ api_football_team_id: fixture.teams.home.id })
              .eq("id", homeTeam.id)
              .is("api_football_team_id", null)
          : Promise.resolve(),
        awayTeam
          ? supabase
              .from("teams")
              .update({ api_football_team_id: fixture.teams.away.id })
              .eq("id", awayTeam.id)
              .is("api_football_team_id", null)
          : Promise.resolve(),
      ]);

      updated += 1;
      updatedMatches.push({ match, fixture });
      messages.push(
        `Actualizado partido ${match.match_number ?? match.id}: ${fixture.goals.home}-${fixture.goals.away}.`,
      );
    }
  }

  let suggestions = 0;
  if (updatedMatches.length) {
    suggestions = await syncScorerSuggestions(supabase, updatedMatches, messages);
  }

  if (updated > 0) {
    await generateKnockoutFromResults(supabase);
    await recalculateAllLeagueScores();
  }

  return {
    ok: true,
    checked,
    skipped,
    updated,
    suggestions,
    messages,
  };
}

// Para cada partido recien cerrado, baja los goleadores de la API y los deja
// como sugerencias pendientes. Nunca toca match_scorers directamente.
async function syncScorerSuggestions(
  supabase: SupabaseClient,
  updatedMatches: { match: SyncableMatch; fixture: ApiFootballFixture }[],
  messages: string[],
): Promise<number> {
  let total = 0;

  for (const { match, fixture } of updatedMatches) {
    let events: ApiFootballEvent[];
    try {
      events = await fetchFixtureEvents(fixture.fixture.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "error";
      messages.push(
        `Sin goleadores para partido ${match.match_number ?? match.id}: ${message}.`,
      );
      continue;
    }

    const homeTeam = getTeam(match.home_team);
    const awayTeam = getTeam(match.away_team);
    const teamIds = [match.home_team_id, match.away_team_id].filter(
      (id): id is string => Boolean(id),
    );

    const { data: playerRows } = teamIds.length
      ? await supabase
          .from("players")
          .select("id, name, team_id, api_football_player_id")
          .in("team_id", teamIds)
      : { data: [] as ScorerLookupPlayer[] };

    const playersByTeamId = new Map<string, ScorerLookupPlayer[]>();
    (playerRows ?? []).forEach((player) => {
      const list = playersByTeamId.get(player.team_id) ?? [];
      list.push(player);
      playersByTeamId.set(player.team_id, list);
    });

    const teamIdByApiTeamId = new Map<number, string>();
    if (homeTeam) teamIdByApiTeamId.set(fixture.teams.home.id, homeTeam.id);
    if (awayTeam) teamIdByApiTeamId.set(fixture.teams.away.id, awayTeam.id);

    const drafts = buildScorerSuggestions(
      match.id,
      events,
      teamIdByApiTeamId,
      playersByTeamId,
    );

    if (!drafts.length) continue;

    // Solo inserta sugerencias nuevas: no pisa lo que el admin ya aplico o
    // descarto para este partido.
    const { data: existing } = await supabase
      .from("match_scorer_suggestions")
      .select("api_player_name")
      .eq("match_id", match.id);
    const seen = new Set((existing ?? []).map((row) => row.api_player_name));

    // Auto-aprendizaje: cuando casamos un goleador por nombre, guardamos su
    // api_football_player_id en el jugador local para que los proximos partidos
    // emparejen por ID estable y sin ambiguedad.
    const learn = drafts.filter((draft) => draft.player_id && draft.api_player_id);
    await Promise.all(
      learn.map((draft) =>
        supabase
          .from("players")
          .update({ api_football_player_id: draft.api_player_id })
          .eq("id", draft.player_id as string)
          .is("api_football_player_id", null)
          .then(
            () => undefined,
            () => undefined,
          ),
      ),
    );

    const fresh = drafts.filter((draft) => !seen.has(draft.api_player_name));
    if (!fresh.length) continue;

    const { error: insertError } = await supabase
      .from("match_scorer_suggestions")
      .insert(fresh.map((draft) => ({ ...draft, status: "pending" })));

    if (insertError) {
      messages.push(
        `No se pudieron guardar goleadores del partido ${match.match_number ?? match.id}: ${insertError.message}.`,
      );
      continue;
    }

    total += fresh.length;
    messages.push(
      `${fresh.length} goleador(es) sugeridos para partido ${match.match_number ?? match.id}.`,
    );
  }

  return total;
}
