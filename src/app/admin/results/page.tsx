import { AdminMatchEditor } from "@/components/admin-match-editor";
import { AdminGroupOrderEditor } from "@/components/admin-group-order-editor";
import { AdminLayout } from "@/components/layouts";
import { PlayerPicker } from "@/components/player-picker";
import {
  rejectPlayerSelectionRequestAction,
  resolvePlayerSelectionRequestAction,
  setAdminScorerGoalsAction,
} from "@/app/actions";
import { STAGE_LABELS } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { calculateRealGroupStandings } from "@/lib/scoring";
import type { Match, MatchScorer, Player, PlayerSelectionRequest, Team } from "@/lib/types";

type MatchScorerRow = MatchScorer & {
  players?: Player | Player[] | null;
};

type LeaderboardEntry = {
  playerId: string;
  name: string;
  flag: string;
  teamName: string;
  pickCount: number;
  captainCount: number;
  goals: number;
  manualOverride: number | null;
};

type ScorerPredictionSummary = {
  player_id: string;
  is_captain: boolean;
};

type AdminScorerPlayer = Player & {
  pickCount: number;
  captainCount: number;
};

const SPAIN_DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});

const SPAIN_DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

function getSpainDateKey(matchDate: string | null) {
  if (!matchDate) return "sin-fecha";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid",
  });

  return formatter.format(new Date(matchDate));
}

function getSpainDateLabel(matchDate: string | null) {
  if (!matchDate) return "Sin fecha definida";
  return SPAIN_DATE_FORMAT.format(new Date(matchDate));
}

function getSpainScheduleLabel(matchDate: string | null) {
  if (!matchDate) return null;
  return SPAIN_DATE_TIME_FORMAT.format(new Date(matchDate));
}

export default async function AdminResultsPage() {
  const { supabase } = await requireAdmin();
  const [
    { data: matchRows },
    { data: teamRows },
    { data: playerRows },
    { data: scorerRows },
    { data: requestRows },
    { data: scorerPredictionRows },
    { data: goalRows },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true, nullsFirst: false }),
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("players")
      .select("*, teams(*)")
      .eq("is_active", true)
      .order("scorer_rank", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase.from("match_scorers").select("*, players(*, teams(*))"),
    supabase
      .from("player_selection_requests")
      .select("*, teams(*), profiles(*), resolved_player:players(*, teams(*))")
      .order("created_at", { ascending: false }),
    supabase.from("scorer_predictions").select("player_id, is_captain"),
    supabase.from("league_player_goals").select("player_id, goals, manual_goals_override"),
  ]);

  const matches = (matchRows ?? []) as Match[];
  const teams = (teamRows ?? []) as Team[];
  const players = (playerRows ?? []) as Player[];
  const scorerData = (scorerRows ?? []) as MatchScorerRow[];
  const requests = (requestRows ?? []) as PlayerSelectionRequest[];
  const scorerPredictions = (scorerPredictionRows ?? []) as ScorerPredictionSummary[];
  const goalTotalsByPlayer = new Map<string, { goals: number; manualOverride: number | null }>();

  (goalRows ?? []).forEach((row) => {
    const current = goalTotalsByPlayer.get(row.player_id);
    const goals = Math.max(current?.goals ?? 0, row.goals ?? 0);
    const manualOverride =
      row.manual_goals_override ?? current?.manualOverride ?? null;
    goalTotalsByPlayer.set(row.player_id, { goals, manualOverride });
  });
  const pickedPlayerIds = new Set(scorerPredictions.map((row) => row.player_id));
  const pickStatsByPlayer = new Map<string, { pickCount: number; captainCount: number }>();

  scorerPredictions.forEach((row) => {
    const stats = pickStatsByPlayer.get(row.player_id) ?? { pickCount: 0, captainCount: 0 };
    stats.pickCount += 1;
    if (row.is_captain) stats.captainCount += 1;
    pickStatsByPlayer.set(row.player_id, stats);
  });

  const pickedPlayers = players
    .filter((player) => pickedPlayerIds.has(player.id))
    .map((player) => ({
      ...player,
      pickCount: pickStatsByPlayer.get(player.id)?.pickCount ?? 0,
      captainCount: pickStatsByPlayer.get(player.id)?.captainCount ?? 0,
    }))
    .sort(
      (left, right) =>
        right.pickCount - left.pickCount ||
        right.captainCount - left.captainCount ||
        left.name.localeCompare(right.name),
    );
  const pickedPlayersByTeam = new Map<string, AdminScorerPlayer[]>();
  pickedPlayers.forEach((player) => {
    const current = pickedPlayersByTeam.get(player.team_id) ?? [];
    current.push(player);
    pickedPlayersByTeam.set(player.team_id, current);
  });

  const scorerRowsByMatch = new Map<string, MatchScorerRow[]>();
  const leaderboardMap = new Map<string, LeaderboardEntry>();

  pickedPlayers.forEach((player) => {
    const goalTotals = goalTotalsByPlayer.get(player.id);
    leaderboardMap.set(player.id, {
      playerId: player.id,
      name: player.name,
      flag: player.teams?.flag_emoji ?? "",
      teamName: player.teams?.name ?? "",
      pickCount: player.pickCount,
      captainCount: player.captainCount,
      goals: goalTotals?.goals ?? 0,
      manualOverride: goalTotals?.manualOverride ?? null,
    });
  });

  scorerData.forEach((row) => {
    const current = scorerRowsByMatch.get(row.match_id) ?? [];
    current.push(row);
    scorerRowsByMatch.set(row.match_id, current);

    if (!pickedPlayerIds.has(row.player_id) || goalTotalsByPlayer.has(row.player_id)) return;

    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) return;
    const pickStats = pickStatsByPlayer.get(row.player_id);
    const entry = leaderboardMap.get(row.player_id) ?? {
      playerId: row.player_id,
      name: player.name,
      flag: player.teams?.flag_emoji ?? "",
      teamName: player.teams?.name ?? "",
      pickCount: pickStats?.pickCount ?? 0,
      captainCount: pickStats?.captainCount ?? 0,
      goals: 0,
      manualOverride: null,
    };
    entry.goals += row.goals;
    leaderboardMap.set(row.player_id, entry);
  });

  const leaderboard = Array.from(leaderboardMap.values()).sort(
    (left, right) => right.goals - left.goals || left.name.localeCompare(right.name),
  );

  const matchesByDate = matches.reduce<Map<string, Match[]>>((groups, match) => {
    const key = getSpainDateKey(match.match_date);
    const current = groups.get(key) ?? [];
    current.push(match);
    groups.set(key, current);
    return groups;
  }, new Map());

  const orderedDateGroups = Array.from(matchesByDate.entries()).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  const groupLetters = Array.from(
    new Set(teams.map((team) => team.group_letter).filter(Boolean)),
  ).sort() as string[];

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Resultados y goleadores</h1>
          <p className="mt-2 max-w-4xl text-slate-300">
            Los partidos están agrupados por fecha de España y los goleadores del admin
            solo muestran jugadores que alguien lleva en sus apuestas.
          </p>
        </div>
        <span className="badge">
          {matches.filter((match) => match.is_finished).length}/{matches.length} partidos cerrados
        </span>
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        <div className="xl:col-span-2">
          <section className="glass rounded-3xl p-5">
            <h2 className="text-2xl font-black">Grupos</h2>
            <p className="mt-2 text-sm text-slate-300">
              Vista rápida de clasificación. El orden manual se usa solo como último desempate.
            </p>
            <div className="mt-4 grid gap-4 xl:grid-cols-4">
              {groupLetters.map((groupLetter) => {
                const rows = calculateRealGroupStandings(teams, matches, groupLetter);
                const rowsKey = rows
                  .map(
                    (row) =>
                      `${row.team.id}:${row.points}:${row.goalDifference}:${row.goalsFor}:${row.goalsAgainst}`,
                  )
                  .join("|");

                return (
                  <AdminGroupOrderEditor
                    key={`${groupLetter}-${rowsKey}`}
                    groupLetter={groupLetter}
                    rows={rows}
                  />
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid gap-6">
          {orderedDateGroups.map(([dateKey, dateMatches]) => (
            <section key={dateKey} className="grid gap-4">
              <div className="sticky top-0 z-10 rounded-3xl border border-white/10 bg-slate-950/85 px-5 py-4 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-black">
                    {getSpainDateLabel(dateMatches[0]?.match_date ?? null)}
                  </h2>
                  <span className="badge">
                    {dateMatches.filter((match) => match.is_finished).length}/{dateMatches.length}
                  </span>
                </div>
              </div>

              {dateMatches.map((match) => {
                const matchScorers = scorerRowsByMatch.get(match.id) ?? [];
                const expandedScorers = matchScorers.flatMap((row) =>
                  Array.from({ length: row.goals }, () => {
                    const player = Array.isArray(row.players) ? row.players[0] : row.players;
                    return {
                      playerId: row.player_id,
                      teamId: player?.team_id ?? "",
                    };
                  }),
                );

                return (
                  <AdminMatchEditor
                    key={match.id}
                    match={match}
                    homePlayers={pickedPlayersByTeam.get(match.home_team_id ?? "") ?? []}
                    awayPlayers={pickedPlayersByTeam.get(match.away_team_id ?? "") ?? []}
                    homeScorerIds={expandedScorers
                      .filter((row) => row.teamId === match.home_team_id)
                      .map((row) => row.playerId)}
                    awayScorerIds={expandedScorers
                      .filter((row) => row.teamId === match.away_team_id)
                      .map((row) => row.playerId)}
                    leaderboard={leaderboard}
                    stageLabel={STAGE_LABELS[match.stage]}
                    scheduleLabel={getSpainScheduleLabel(match.match_date)}
                  />
                );
              })}
            </section>
          ))}
        </div>

        <div className="grid content-start gap-6">
          <section className="glass rounded-3xl p-5">
            <h2 className="text-2xl font-black">Clasificación de goleadores</h2>
            <div className="mt-2 text-sm text-slate-300">
              Aparecen todos los jugadores elegidos por usuarios, aunque todavía lleven 0 goles.
            </div>
            <div className="mt-4 grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
              {leaderboard.length ? (
                leaderboard.map((entry) => (
                  <div
                    key={entry.playerId}
                    className="rounded-2xl bg-black/20 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {entry.flag} {entry.name}
                        </div>
                        <div className="text-xs text-slate-300">
                          {entry.teamName} · {entry.pickCount} eleg.
                          {entry.captainCount ? ` · ${entry.captainCount} cap.` : ""}
                          {entry.manualOverride !== null ? " · manual" : ""}
                        </div>
                      </div>
                      <strong className="text-2xl leading-none">{entry.goals}</strong>
                    </div>
                    <form action={setAdminScorerGoalsAction} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <input type="hidden" name="player_id" value={entry.playerId} />
                      <input
                        name="goals"
                        type="number"
                        min="0"
                        defaultValue={entry.goals}
                        className="field h-10 text-center"
                      />
                      <button className="btn-secondary h-10 px-3 py-0">Fijar</button>
                    </form>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-300">Todavía nadie ha elegido goleadores.</div>
              )}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <h2 className="text-2xl font-black">Nombres manuales pendientes</h2>
            <div className="mt-4 grid gap-4">
              {requests.filter((request) => request.status !== "approved").length ? (
                requests
                  .filter((request) => request.status !== "approved")
                  .map((request) => (
                    <div key={request.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-black">
                            {request.profiles?.username ?? "Usuario"} pide validar:
                          </div>
                          <div className="mt-1 text-lg">
                            {request.player_name}
                            {request.teams?.name ? ` · ${request.teams.name}` : ""}
                          </div>
                          <div className="mt-1 text-sm text-slate-300">
                            Campo: {request.field_key} · Liga {request.league_id}
                          </div>
                        </div>
                        <span className="badge">{request.status}</span>
                      </div>

                      <form action={resolvePlayerSelectionRequestAction} className="mt-4 grid gap-3">
                        <input type="hidden" name="request_id" value={request.id} />
                        <PlayerPicker
                          name="resolved_player_id"
                          players={players}
                          teams={teams}
                          defaultValue={request.resolved_player_id}
                        />
                        <button className="btn-primary">Validar y asignar jugador</button>
                      </form>

                      <form action={rejectPlayerSelectionRequestAction} className="mt-3">
                        <input type="hidden" name="request_id" value={request.id} />
                        <button className="btn-secondary">Marcar para corrección manual</button>
                      </form>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-slate-300">No hay solicitudes pendientes.</div>
              )}
            </div>
          </section>
        </div>
      </section>
    </AdminLayout>
  );
}


