import { notFound } from "next/navigation";
import { UserLayout } from "@/components/layouts";
import { MatchCard, PlayerBadge, ScoreBreakdownCard } from "@/components/ui";
import { requireUser } from "@/lib/data";

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
    { data: matchPredictions },
    { data: scorerPredictions },
    { data: awardPrediction },
  ] = await Promise.all([
    supabase
      .from("scores")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("match_predictions")
      .select("*, matches(*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))")
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
  ]);

  return (
    <UserLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Apuestas de {profile?.display_name}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <section className="space-y-4">
          <h2 className="text-xl font-black">Resultados apostados</h2>
          {(matchPredictions ?? []).map((prediction) => (
            <div key={prediction.id} className="glass rounded-2xl p-4">
              <MatchCard match={prediction.matches} />
              <div className="mt-3 text-center font-black text-[#ff2bd6]">
                Apostó {prediction.predicted_home_score} - {prediction.predicted_away_score}
              </div>
            </div>
          ))}
        </section>
        <aside className="space-y-4">
          <ScoreBreakdownCard score={score} />
          <div className="glass rounded-2xl p-5">
            <h2 className="font-black">Goleadores</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(scorerPredictions ?? []).map((prediction) => (
                <PlayerBadge key={prediction.id} player={prediction.players} />
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h2 className="font-black">Premios</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div>Pichichi: <PlayerBadge player={awardPrediction?.top_scorer} /></div>
              <div>Mejor jugador: <PlayerBadge player={awardPrediction?.best_player} /></div>
              <div>Mejor portero: <PlayerBadge player={awardPrediction?.best_goalkeeper} /></div>
              <div>Mejor joven: <PlayerBadge player={awardPrediction?.best_young} /></div>
            </div>
          </div>
        </aside>
      </div>
    </UserLayout>
  );
}
