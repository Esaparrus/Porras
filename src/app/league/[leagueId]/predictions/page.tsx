import {
  saveAwardPredictionsAction,
  saveScorerPredictionsAction,
} from "@/app/actions";
import { UserLayout } from "@/components/layouts";
import { PlayerBetsView } from "@/components/player-bets-view";
import { PlayerPicker } from "@/components/player-picker";
import { ScorerPickers } from "@/components/scorer-pickers";
import { PredictionWorkflow } from "@/components/prediction-workflow";
import { StageTabs } from "@/components/ui";
import { getActivePlayers, requireUser } from "@/lib/data";
import { getPlayerBetsViewData } from "@/lib/player-bets-data";
import type {
  Match,
  MatchPrediction,
  PredictionTiebreakSelection,
  PlayerSelectionRequest,
  Team,
} from "@/lib/types";

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();
  const leagueClosed = league?.status !== "open";
  const { count: finishedCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("is_finished", true);

  // Porra cerrada o Mundial ya en marcha: "Mis apuestas" deja de ser el formulario
  // y pasa a la vista de solo lectura, la misma que se ve al pinchar un usuario en
  // el ranking.
  if (leagueClosed || (finishedCount ?? 0) > 0) {
    const betsData = await getPlayerBetsViewData(supabase, leagueId, user.id);
    if (betsData) {
      return (
        <UserLayout leagueId={leagueId}>
          <PlayerBetsView {...betsData} />
        </UserLayout>
      );
    }
  }

  const [
    { data: matches },
    { data: predictions },
    { data: teams },
    players,
    { data: scorerPredictions },
    { data: awardPrediction },
    { data: requestRows },
    { data: tiebreakRows },
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
    supabase.from("teams").select("*").order("group_letter").order("manual_order"),
    getActivePlayers(supabase),
    supabase
      .from("scorer_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
    supabase
      .from("award_predictions")
      .select("*")
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
  ]);

  const matchRows = (matches ?? []) as Match[];
  const predictionRows = (predictions ?? []) as MatchPrediction[];
  const teamRows = (teams ?? []) as Team[];
  const groupLetters = Array.from(
    new Set(teamRows.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const scorerByIndex = scorerPredictions ?? [];
  const completedScorerSlots = Math.min(
    3,
    new Set(scorerByIndex.map((row) => row.player_id)).size,
  );
  const manualRequests = new Map(
    ((requestRows ?? []) as PlayerSelectionRequest[]).map((request) => [
      request.field_key,
      request,
    ]),
  );
  const completedMatches = predictionRows.filter(
    (prediction) =>
      prediction.predicted_home_score !== null &&
      prediction.predicted_away_score !== null,
  ).length;

  return (
    <UserLayout leagueId={leagueId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Mis apuestas</h1>
          <p className="mt-2 text-slate-300">
            Partidos completados: {completedMatches}/{matchRows.length}
          </p>
        </div>
        <span className="badge">
          {leagueClosed || league?.lock_matches ? "Cerrado" : "Abierto"}
        </span>
      </div>
      <StageTabs
        items={[
          { href: "#grupos", label: "Grupos" },
          { href: "#partidos", label: "Partidos" },
          { href: "#eliminatorias", label: "Eliminatorias" },
          { href: "#goleadores", label: "Jugadores" },
          { href: "#premios", label: "Premios" },
          { href: "#resumen", label: "Resumen" },
        ]}
      />
      <section className="mt-6">
        <PredictionWorkflow
          leagueId={leagueId}
          matches={matchRows}
          predictions={predictionRows}
          tiebreakSelections={(tiebreakRows ?? []) as PredictionTiebreakSelection[]}
          teams={teamRows}
          groupLetters={groupLetters}
          locked={Boolean(leagueClosed || league?.lock_matches || league?.lock_knockouts)}
        />
      </section>
      <section id="goleadores" className="mt-10">
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
          <button disabled={leagueClosed || league?.lock_scorers} className="btn-primary mt-5 w-full">
            Guardar goleadores
          </button>
        </form>
      </section>
      <section id="premios" className="mt-10">
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
          <button disabled={leagueClosed || league?.lock_awards} className="btn-primary mt-5 w-full">
            Guardar premios
          </button>
        </form>
      </section>
      <section id="resumen" className="mt-10 glass rounded-3xl p-5">
        <h2 className="text-2xl font-black">Resumen final</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>📅 Partidos completados: {completedMatches}/{matchRows.length}</div>
          <div>⚽ Goleadores elegidos: {completedScorerSlots}/3</div>
          <div>🏆 Premios elegidos: {awardPrediction ? "4/4" : "0/4"}</div>
          <div>🔀 Eliminatorias: se calculan con tus resultados guardados</div>
        </div>
      </section>
    </UserLayout>
  );
}
