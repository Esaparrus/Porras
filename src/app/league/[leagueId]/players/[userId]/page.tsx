import { notFound } from "next/navigation";
import { UserLayout } from "@/components/layouts";
import { PlayerBetsView, type BetMatch } from "@/components/player-bets-view";
import { requireUser } from "@/lib/data";
import {
  BEST_THIRD_SCOPE_KEY,
  buildManualRankMap,
  buildTiebreakDraft,
  getTiebreakScopeId,
} from "@/lib/prediction-tiebreaks";
import {
  buildPredictedKnockoutEntrants,
  type BracketEntrants,
  type BracketPrediction,
} from "@/lib/knockout-bracket";
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
  PointSettings,
  Player,
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
  entrants: BracketEntrants | undefined,
  prediction: BracketPrediction | undefined,
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

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string; userId: string }>;
}) {
  const { leagueId, userId } = await params;
  const { supabase } = await requireUser();
  const [{ data: league }, { data: profile }, { count: finishedMatches }] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("is_finished", true),
  ]);
  const visible =
    league?.predictions_visible ||
    league?.status !== "open" ||
    (finishedMatches ?? 0) > 0;
  if (!visible) notFound();

  const [
    { data: score },
    { data: matches },
    { data: teams },
    { data: matchPredictions },
    { data: scorerPredictions },
    { data: awardPrediction },
    { data: tiebreakRows },
    { data: settingsRow },
    { data: goalRows },
  ] = await Promise.all([
    supabase
      .from("scores")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true, nullsFirst: false }),
    supabase.from("teams").select("*").order("group_letter").order("manual_order"),
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", userId),
    supabase
      .from("scorer_predictions")
      .select("*, players(*, teams(*))")
      .eq("league_id", leagueId)
      .eq("user_id", userId),
    supabase
      .from("award_predictions")
      .select("*, top_scorer:players!award_predictions_top_scorer_player_id_fkey(*, teams(*)), best_player:players!award_predictions_best_player_id_fkey(*, teams(*)), best_goalkeeper:players!award_predictions_best_goalkeeper_id_fkey(*, teams(*)), best_young:players!award_predictions_best_young_player_id_fkey(*, teams(*))")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("prediction_tiebreak_selections")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .order("rank"),
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .maybeSingle(),
    supabase
      .from("league_player_goals")
      .select("player_id, goals")
      .eq("league_id", leagueId),
  ]);

  const matchRows = (matches ?? []) as Match[];
  const teamRows = (teams ?? []) as Team[];
  const predictionRows = (matchPredictions ?? []) as MatchPrediction[];
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
  const resultsStarted = matchRows.some((match) => match.is_finished);
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

  // Reconstruye la clasificacion prevista de cada grupo con las apuestas del
  // usuario (incluyendo sus desempates manuales) y, a partir de ahi, el cuadro
  // de eliminatorias que se deriva de esas apuestas.
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
  const bestThirds = calculateBestThirdPlacedTeams(
    Array.from(standingsByGroup.values()),
    {
      manualRanksByTeamId: buildManualRankMap(
        tiebreakDraft[getTiebreakScopeId("best_third", BEST_THIRD_SCOPE_KEY)],
      ),
    },
  );
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
    // Puntos ganados en este partido (solo si ya tiene resultado real).
    let points = 0;
    if (match.is_finished && prediction) {
      points = isKnockout
        ? calculateLiveKnockoutMatchPoints(prediction, match, settings, {
            homeTeamId: entrants?.homeTeam?.id ?? null,
            awayTeamId: entrants?.awayTeam?.id ?? null,
          })
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

  const groupMatches = matchRows
    .filter((match) => match.stage === "group")
    .map(toBetMatch);

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
      return {
        player,
        goals,
        points: goals * settings.scorer_goal_points,
      };
    });
  const scorerMaxPoints = settings.scorer_max_points;

  const awards = {
    topScorer: (awardPrediction?.top_scorer ?? null) as Player | null,
    bestPlayer: (awardPrediction?.best_player ?? null) as Player | null,
    bestGoalkeeper: (awardPrediction?.best_goalkeeper ?? null) as Player | null,
    bestYoung: (awardPrediction?.best_young ?? null) as Player | null,
  };

  return (
    <UserLayout leagueId={leagueId}>
      <PlayerBetsView
        displayName={profile?.display_name || profile?.username || "Jugador"}
        avatarEmoji={profile?.avatar_emoji ?? null}
        score={score ?? null}
        groups={groups}
        groupMatches={groupMatches}
        knockoutRounds={knockoutRounds}
        champion={champion}
        scorers={scorers}
        scorerMaxPoints={scorerMaxPoints}
        resultsStarted={resultsStarted}
        awards={awards}
      />
    </UserLayout>
  );
}
