import { LeagueCalendar } from "@/components/league-calendar";
import { UserLayout } from "@/components/layouts";
import { STAGE_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/data";
import { predictedWinnerId } from "@/lib/knockout-bracket";
import { withDefaultSettings } from "@/lib/scoring";
import {
  NEXT_REACHED_STAGE,
  buildPredictedReachedByStage,
  buildUserKnockoutEntrants,
  knockoutMarkerCounts,
  reachedPointsForStage,
} from "@/lib/user-bracket";
import type {
  Match,
  MatchPrediction,
  PointSettings,
  PredictionTiebreakSelection,
  Team,
} from "@/lib/types";

export default async function LeagueCalendarPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();
  const [
    { data: matches },
    { data: predictions },
    { data: teams },
    { data: tiebreaks },
    { data: settingsRow },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true, nullsFirst: false }),
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
    supabase.from("teams").select("*"),
    supabase
      .from("prediction_tiebreak_selections")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .maybeSingle(),
  ]);

  const matchRows = (matches ?? []) as Match[];
  const predictionRows = (predictions ?? []) as MatchPrediction[];
  const predictionByMatchId = new Map(
    predictionRows.map((prediction) => [prediction.match_id, prediction]),
  );
  const settings = withDefaultSettings({
    league_id: leagueId,
    ...(settingsRow ?? {}),
  }) as PointSettings;

  // Reconstruye mi cuadro de eliminatorias para saber, cruce a cruce, si las dos
  // selecciones que de verdad juegan coinciden con las que coloqué: solo entonces
  // mi marcador cuenta y tiene sentido mostrarlo en el calendario.
  const myKnockoutEntrants = buildUserKnockoutEntrants({
    teams: (teams ?? []) as Team[],
    matches: matchRows,
    predictions: predictionRows,
    tiebreakSelections: (tiebreaks ?? []) as PredictionTiebreakSelection[],
  });

  // Campeón que predije (ganador de la final) y conjunto de selecciones que
  // coloqué en cada ronda, para avisar de los puntos de "selección clasificada".
  const finalMatch = matchRows.find((match) => match.match_number === 104);
  const finalPrediction = finalMatch ? predictionByMatchId.get(finalMatch.id) : undefined;
  const predictedChampionId = predictedWinnerId(myKnockoutEntrants.get(104), {
    winnerId: finalPrediction?.predicted_winner_team_id ?? null,
    homeScore: finalPrediction?.predicted_home_score ?? null,
    awayScore: finalPrediction?.predicted_away_score ?? null,
  });
  const predictedReachedByStage = buildPredictedReachedByStage(
    matchRows,
    myKnockoutEntrants,
    predictedChampionId,
  );

  const calendarMatches = matchRows.map((match) => {
    const isKnockout = match.stage !== "group";
    const realTeamsKnown = match.home_team_id != null && match.away_team_id != null;
    const knockoutNoCount =
      isKnockout &&
      realTeamsKnown &&
      !knockoutMarkerCounts(match, myKnockoutEntrants.get(match.match_number ?? 0));

    // Si una de las selecciones que juega es de las que coloqué en la ronda
    // siguiente, ganaría los puntos de "selección clasificada" al pasar.
    const nextStage = isKnockout ? NEXT_REACHED_STAGE[match.stage] : undefined;
    const nextPoints = nextStage ? reachedPointsForStage(nextStage, settings) : 0;
    const nextReason =
      nextStage === "champion"
        ? "proclamarse campeón"
        : nextStage
          ? `clasificarse a ${(STAGE_LABELS[nextStage] ?? nextStage).toLowerCase()}`
          : "";
    const advanceHints =
      isKnockout && realTeamsKnown && !match.is_finished && nextStage && nextPoints > 0
        ? [match.home_team, match.away_team]
            .filter((team): team is Team => Boolean(team))
            .filter((team) => predictedReachedByStage.get(nextStage)?.has(team.id))
            .map((team) => ({ team: { flag_code: team.flag_code, flag_emoji: team.flag_emoji, short_name: team.short_name }, points: nextPoints, reason: nextReason }))
        : [];

    return {
      ...match,
      myPrediction: predictionByMatchId.get(match.id) ?? null,
      knockoutNoCount,
      advanceHints,
    };
  });

  return (
    <UserLayout leagueId={leagueId}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Calendario</h1>
            <p className="mt-2 text-slate-300">
              Junio y julio con tus resultados puestos para cada partido.
            </p>
          </div>
          <span className="badge">Mundial 2026</span>
        </div>

        <LeagueCalendar leagueId={leagueId} matches={calendarMatches} />
      </div>
    </UserLayout>
  );
}
