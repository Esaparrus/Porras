import { RankingEvolutionChart } from "@/components/ranking-evolution-chart";
import { requireUser } from "@/lib/data";
import { fetchAllRows } from "@/lib/supabase/paginate";
import {
  buildRankingEvolution,
  type RankingEvolutionMember,
} from "@/lib/ranking-evolution";
import { withDefaultSettings } from "@/lib/scoring";
import type {
  Match,
  MatchPrediction,
  PointSettings,
  PredictionTiebreakSelection,
  Team,
} from "@/lib/types";

export default async function LeagueRankingEvolutionPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireUser();
  const [
    { data: members },
    { data: matches },
    { data: teams },
    { data: settings },
    matchPredictions,
    { data: scorerPredictions },
    { data: awardPredictions },
    { data: tiebreakSelections },
    { data: matchScorers },
    { data: finalAwards },
  ] = await Promise.all([
    supabase
      .from("league_members")
      .select("user_id, profiles(*)")
      .eq("league_id", leagueId),
    supabase.from("matches").select("*"),
    supabase.from("teams").select("*"),
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .maybeSingle(),
    // Paginado: las predicciones de toda la liga superan las 1000 filas; sin paginar
    // se truncarían y la evolución del ranking saldría mal para parte de los jugadores.
    fetchAllRows<MatchPrediction>((from, to) =>
      supabase
        .from("match_predictions")
        .select("*")
        .eq("league_id", leagueId)
        .range(from, to),
    ),
    supabase
      .from("scorer_predictions")
      .select("user_id, player_id")
      .eq("league_id", leagueId),
    supabase
      .from("award_predictions")
      .select("user_id, top_scorer_player_id, best_player_id, best_goalkeeper_id, best_young_player_id")
      .eq("league_id", leagueId),
    supabase
      .from("prediction_tiebreak_selections")
      .select("*")
      .eq("league_id", leagueId)
      .order("rank"),
    supabase.from("match_scorers").select("match_id, player_id, goals"),
    supabase.from("final_awards").select("*").eq("league_id", leagueId).maybeSingle(),
  ]);
  const pointSettings = withDefaultSettings({
    league_id: leagueId,
    ...(settings ?? {}),
  }) as PointSettings;
  const data = buildRankingEvolution({
    members: (members ?? []) as RankingEvolutionMember[],
    matches: (matches ?? []) as Match[],
    teams: (teams ?? []) as Team[],
    settings: pointSettings,
    matchPredictions: (matchPredictions ?? []) as MatchPrediction[],
    scorerPredictions: scorerPredictions ?? [],
    awardPredictions: awardPredictions ?? [],
    tiebreakSelections: (tiebreakSelections ?? []) as PredictionTiebreakSelection[],
    matchScorers: matchScorers ?? [],
    finalAwards,
  });

  return <RankingEvolutionChart leagueId={leagueId} data={data} />;
}
