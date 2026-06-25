import {
  saveAwardPredictionsAction,
  saveScorerPredictionsAction,
} from "@/app/actions";
import { UserLayout } from "@/components/layouts";
import { PlayerPicker } from "@/components/player-picker";
import { PlayerBetsView, type BetMatch } from "@/components/player-bets-view";
import { ScorerPickers } from "@/components/scorer-pickers";
import { PredictionWorkflow } from "@/components/prediction-workflow";
import { getActivePlayers, requireUser } from "@/lib/data";
import {
  BEST_THIRD_SCOPE_KEY,
  buildManualRankMap,
  buildTiebreakDraft,
  getTiebreakScopeId,
} from "@/lib/prediction-tiebreaks";
import { buildPredictedKnockoutEntrants } from "@/lib/knockout-bracket";
import {
  calculateBestThirdPlacedTeams,
  calculateGroupPredictionPoints,
  calculateLiveKnockoutMatchPoints,
  calculateMatchPredictionPoints,
  calculatePredictedGroupStandings,
  calculateRealGroupStandings,
  withDefaultSettings,
} from "@/lib/scoring";
import type {
  Match,
  MatchPrediction,
  Player,
  PlayerSelectionRequest,
  PointSettings,
  PredictionTiebreakSelection,
  StandingRow,
  Team,
} from "@/lib/types";

const KNOCKOUT_STAGE_ORDER: Match["stage"][] = [
  "round_32",
  "round_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

function predictedAdvanceTeamId(
  entrants: { homeTeam: Team | null; awayTeam: Team | null } | undefined,
  prediction:
    | { winnerId: string | null; homeScore: number | null; awayScore: number | null }
    | undefined,
): string | null {
  if (!entrants) return null;
  const { homeTeam, awayTeam } = entrants;
  if (prediction?.winnerId && homeTeam && prediction.winnerId === homeTeam.id) return homeTeam.id;
  if (prediction?.winnerId && awayTeam && prediction.winnerId === awayTeam.id) return awayTeam.id;
  if (prediction?.homeScore != null && prediction?.awayScore != null) {
    if (prediction.homeScore > prediction.awayScore) return homeTeam?.id ?? null;
    if (prediction.awayScore > prediction.homeScore) return awayTeam?.id ?? null;
  }
  return null;
}

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();

  const [
    { data: league },
    { data: profile },
    { data: score },
    { data: matches },
    { data: predictions },
    { data: teams },
    players,
    { data: scorerPredictions },
    { data: awardPrediction },
    { data: requestRows },
    { data: tiebreakRows },
    { data: settingsRow },
    { data: goalRows },
  ] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("scores")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("matches")
      .select(
        "*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)",
      )
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true, nullsFirst: false }),
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
    supabase.from("teams").select("*").order("group_letter").order("manual_order"),
    getActivePlayers(supabase),
    supabase
      .from("scorer_predictions")
      .select("*, players(*, teams(*))")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
    supabase
      .from("award_predictions")
      .select(
        "*, top_scorer:players!award_predictions_top_scorer_player_id_fkey(*, teams(*)), best_player:players!award_predictions_best_player_id_fkey(*, teams(*)), best_goalkeeper:players!award_predictions_best_goalkeeper_id_fkey(*, teams(*)), best_young:players!award_predictions_best_young_player_id_fkey(*, teams(*))",
      )
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_selection_requests")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
    supabase
      .from("prediction_tiebreak_selections")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .order("rank"),
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .maybeSingle(),
    supabase.from("league_player_goals").select("player_id, goals").eq("league_id", leagueId),
  ]);

  const matchRows = (matches ?? []) as Match[];
  const teamRows = (teams ?? []) as Team[];
  const predictionRows = (predictions ?? []) as MatchPrediction[];
  const settings = withDefaultSettings({
    league_id: leagueId,
    ...(settingsRow ?? {}),
  }) as PointSettings;
  const scorerTotals = new Map<string, number>(
    ((goalRows ?? []) as Array<{ player_id: string; goals: number }>).map((row) => [
      row.player_id,
      row.goals,
    ]),
  );
  const leagueClosed = league?.status !== "open";
  const resultsStarted = matchRows.some((match) => match.is_finished);
  const locked = Boolean(leagueClosed || league?.lock_matches || league?.lock_knockouts);
  const lockedScorers = Boolean(leagueClosed || league?.lock_scorers);
  const lockedAwards = Boolean(leagueClosed || league?.lock_awards);

  const tiebreakDraft = buildTiebreakDraft(
    (tiebreakRows ?? []) as PredictionTiebreakSelection[],
  );
  const predictionByMatchId = new Map(
    predictionRows.map((prediction) => [prediction.match_id, prediction]),
  );
  const teamById = new Map(teamRows.map((team) => [team.id, team]));

  const groupLetters = Array.from(
    new Set(teamRows.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];

  const standingsByGroup = new Map(
    groupLetters.map((group) => [
      group,
      calculatePredictedGroupStandings(teamRows, matchRows, predictionRows, group, {
        manualRanksByTeamId: buildManualRankMap(
          tiebreakDraft[getTiebreakScopeId("group", group)],
        ),
      }),
    ]),
  );
  const bestThirds = calculateBestThirdPlacedTeams(Array.from(standingsByGroup.values()), {
    manualRanksByTeamId: buildManualRankMap(
      tiebreakDraft[getTiebreakScopeId("best_third", BEST_THIRD_SCOPE_KEY)],
    ),
  });
  const knockoutEntrants = buildPredictedKnockoutEntrants(
    matchRows,
    standingsByGroup,
    bestThirds,
    (matchId) => {
      const prediction = predictionByMatchId.get(matchId);
      if (!prediction) return undefined;
      return {
        winnerId: prediction.predicted_winner_team_id,
        homeScore: prediction.predicted_home_score,
        awayScore: prediction.predicted_away_score,
      };
    },
  );

  const toBetMatch = (match: Match): BetMatch => {
    const prediction = predictionByMatchId.get(match.id);
    const isKnockout = match.stage !== "group";
    const entrants = isKnockout ? knockoutEntrants.get(match.match_number ?? 0) : undefined;
    const homeTeam = isKnockout
      ? (match.home_team ?? entrants?.homeTeam ?? null)
      : (match.home_team ?? null);
    const awayTeam = isKnockout
      ? (match.away_team ?? entrants?.awayTeam ?? null)
      : (match.away_team ?? null);
    const advanceId = isKnockout
      ? predictedAdvanceTeamId(
          { homeTeam, awayTeam },
          prediction
            ? {
                winnerId: prediction.predicted_winner_team_id,
                homeScore: prediction.predicted_home_score,
                awayScore: prediction.predicted_away_score,
              }
            : undefined,
        )
      : null;
    let points = 0;
    if (match.is_finished && prediction) {
      points = isKnockout
        ? calculateLiveKnockoutMatchPoints(prediction, match, settings)
        : calculateMatchPredictionPoints(prediction, match, settings).points;
    }
    return {
      id: match.id,
      matchNumber: match.match_number,
      stage: match.stage,
      groupLetter: match.group_letter,
      matchDate: match.match_date,
      homeTeam,
      awayTeam,
      homePlaceholder: match.home_placeholder,
      awayPlaceholder: match.away_placeholder,
      predictedHome: prediction?.predicted_home_score ?? null,
      predictedAway: prediction?.predicted_away_score ?? null,
      advanceTeam: advanceId ? (teamById.get(advanceId) ?? null) : null,
      isFinished: match.is_finished,
      realHome: match.is_finished ? match.home_score : null,
      realAway: match.is_finished ? match.away_score : null,
      points,
    };
  };

  const groupMatches = matchRows.filter((match) => match.stage === "group").map(toBetMatch);

  const knockoutRounds = KNOCKOUT_STAGE_ORDER.map((stage) => ({
    stage,
    matches: matchRows
      .filter((match) => match.stage === stage)
      .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0))
      .map(toBetMatch),
  })).filter((round) => round.matches.length > 0);

  const finalMatch = matchRows.find((match) => match.match_number === 104);
  const championId = finalMatch
    ? predictedAdvanceTeamId(knockoutEntrants.get(104), {
        winnerId: predictionByMatchId.get(finalMatch.id)?.predicted_winner_team_id ?? null,
        homeScore: predictionByMatchId.get(finalMatch.id)?.predicted_home_score ?? null,
        awayScore: predictionByMatchId.get(finalMatch.id)?.predicted_away_score ?? null,
      })
    : null;
  const champion = championId ? (teamById.get(championId) ?? null) : null;

  const groups = groupLetters.map((letter) => {
    const groupMatchRows = matchRows.filter(
      (match) => match.stage === "group" && match.group_letter === letter,
    );
    const isCompleted =
      groupMatchRows.length > 0 && groupMatchRows.every((m) => m.is_finished);
    const predictedStandings = (standingsByGroup.get(letter) ?? []) as StandingRow[];
    const realStandings = isCompleted
      ? calculateRealGroupStandings(teamRows, matchRows, letter)
      : [];
    const points = isCompleted
      ? calculateGroupPredictionPoints(
          [predictedStandings],
          [realStandings],
          settings,
          [true],
          new Set(),
        )
      : 0;
    return {
      letter,
      standings: predictedStandings,
      matches: groupMatches.filter((match) => match.groupLetter === letter),
      isCompleted,
      points,
    };
  });

  const scorers = ((scorerPredictions ?? []) as Array<{ players?: Player | null }>)
    .map((row) => row.players ?? null)
    .filter((player): player is Player => Boolean(player))
    .map((player) => {
      const goals = scorerTotals.get(player.id) ?? 0;
      return { player, goals, points: goals * settings.scorer_goal_points };
    });

  const awards = {
    topScorer: (awardPrediction?.top_scorer ?? null) as Player | null,
    bestPlayer: (awardPrediction?.best_player ?? null) as Player | null,
    bestGoalkeeper: (awardPrediction?.best_goalkeeper ?? null) as Player | null,
    bestYoung: (awardPrediction?.best_young ?? null) as Player | null,
  };

  const manualRequests = new Map(
    ((requestRows ?? []) as PlayerSelectionRequest[]).map((r) => [r.field_key, r]),
  );
  const scorerByIndex = (scorerPredictions ?? []) as Array<{ player_id: string }>;
  const displayName = profile?.display_name || profile?.username || "Mis apuestas";
  const avatarEmoji = profile?.avatar_emoji ?? null;

  return (
    <UserLayout leagueId={leagueId}>
      <PlayerBetsView
        displayName={displayName}
        avatarEmoji={avatarEmoji}
        score={score ?? null}
        groups={groups}
        groupMatches={groupMatches}
        knockoutRounds={knockoutRounds}
        champion={champion}
        scorers={scorers}
        scorerMaxPoints={settings.scorer_max_points}
        resultsStarted={resultsStarted}
        awards={awards}
      />

      {!locked && (
        <details className="mt-10 glass rounded-3xl">
          <summary className="cursor-pointer select-none px-5 py-4 text-xl font-black">
            Editar predicciones de partidos
          </summary>
          <div className="px-2 pb-4">
            <PredictionWorkflow
              leagueId={leagueId}
              matches={matchRows}
              predictions={predictionRows}
              tiebreakSelections={(tiebreakRows ?? []) as PredictionTiebreakSelection[]}
              teams={teamRows}
              groupLetters={groupLetters}
              locked={false}
            />
          </div>
        </details>
      )}

      {!lockedScorers && (
        <section className="mt-6">
          <form action={saveScorerPredictionsAction} className="glass rounded-3xl p-5">
            <input type="hidden" name="league_id" value={leagueId} />
            <h2 className="text-2xl font-black">⚽ Goleadores</h2>
            <ScorerPickers
              players={players ?? []}
              teams={teamRows}
              defaultValues={[
                scorerByIndex[0]?.player_id,
                scorerByIndex[1]?.player_id,
                scorerByIndex[2]?.player_id,
              ]}
            />
            <button className="btn-primary mt-5 w-full">Guardar goleadores</button>
          </form>
        </section>
      )}

      {!lockedAwards && (
        <section className="mt-6">
          <form action={saveAwardPredictionsAction} className="glass rounded-3xl p-5">
            <input type="hidden" name="league_id" value={leagueId} />
            <h2 className="text-2xl font-black">🏆 Premios</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">⚽ Pichichi</span>
                <PlayerPicker
                  name="top_scorer_player_id"
                  players={players ?? []}
                  teams={teamRows}
                  defaultValue={awardPrediction?.top_scorer_player_id}
                  allowManual
                  manualDefaultName={manualRequests.get("top_scorer_player_id")?.player_name}
                  manualDefaultTeamId={manualRequests.get("top_scorer_player_id")?.team_id}
                  requestStatus={manualRequests.get("top_scorer_player_id")?.status}
                />
              </label>
              <label>
                <span className="label">🌟 Mejor jugador</span>
                <PlayerPicker
                  name="best_player_id"
                  players={players ?? []}
                  teams={teamRows}
                  defaultValue={awardPrediction?.best_player_id}
                  allowManual
                  manualDefaultName={manualRequests.get("best_player_id")?.player_name}
                  manualDefaultTeamId={manualRequests.get("best_player_id")?.team_id}
                  requestStatus={manualRequests.get("best_player_id")?.status}
                />
              </label>
              <label>
                <span className="label">🧤 Mejor portero</span>
                <PlayerPicker
                  name="best_goalkeeper_id"
                  players={players ?? []}
                  teams={teamRows}
                  defaultValue={awardPrediction?.best_goalkeeper_id}
                  allowManual
                  manualDefaultName={manualRequests.get("best_goalkeeper_id")?.player_name}
                  manualDefaultTeamId={manualRequests.get("best_goalkeeper_id")?.team_id}
                  requestStatus={manualRequests.get("best_goalkeeper_id")?.status}
                />
              </label>
              <label>
                <span className="label">🧒 Mejor joven</span>
                <PlayerPicker
                  name="best_young_player_id"
                  players={players ?? []}
                  teams={teamRows}
                  defaultValue={awardPrediction?.best_young_player_id}
                  allowManual
                  manualDefaultName={manualRequests.get("best_young_player_id")?.player_name}
                  manualDefaultTeamId={manualRequests.get("best_young_player_id")?.team_id}
                  requestStatus={manualRequests.get("best_young_player_id")?.status}
                />
              </label>
            </div>
            <button className="btn-primary mt-5 w-full">Guardar premios</button>
          </form>
        </section>
      )}
    </UserLayout>
  );
}
