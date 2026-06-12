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

export type ApiFootballSyncResult = {
  ok: boolean;
  checked: number;
  updated: number;
  skipped: number;
  messages: string[];
};

const FINISHED_STATUS = new Set(["FT", "AET", "PEN"]);
const GROUP_DELAY_MINUTES = 150;
const KNOCKOUT_DELAY_MINUTES = 210;
const MAX_LOOKBACK_MINUTES = 12 * 60;

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
  now = new Date(),
): Promise<ApiFootballSyncResult> {
  const messages: string[] = [];
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

  for (const [date, matches] of byDate) {
    const fixtures = await fetchFixturesByDate(date);
    checked += fixtures.length;

    for (const match of matches) {
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
      messages.push(
        `Actualizado partido ${match.match_number ?? match.id}: ${fixture.goals.home}-${fixture.goals.away}.`,
      );
    }
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
    messages,
  };
}
