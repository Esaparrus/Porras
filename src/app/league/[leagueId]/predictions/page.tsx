import {
  saveAwardPredictionsAction,
  saveMatchPredictionsAction,
  saveScorerPredictionsAction,
} from "@/app/actions";
import { UserLayout } from "@/components/layouts";
import {
  GroupStandingTable,
  PlayerSearchCombobox,
  PredictionInput,
  StageTabs,
} from "@/components/ui";
import { requireUser } from "@/lib/data";
import { calculatePredictedGroupStandings } from "@/lib/scoring";
import type { Match, MatchPrediction, Team } from "@/lib/types";

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();
  const [
    { data: league },
    { data: matches },
    { data: predictions },
    { data: teams },
    { data: players },
    { data: scorerPredictions },
    { data: awardPrediction },
  ] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("stage")
      .order("group_letter"),
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
    supabase.from("teams").select("*").order("group_letter").order("manual_order"),
    supabase.from("players").select("*, teams(*)").eq("is_active", true).order("name"),
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
  ]);

  const matchRows = (matches ?? []) as Match[];
  const predictionRows = (predictions ?? []) as MatchPrediction[];
  const groupLetters = Array.from(
    new Set((teams ?? []).map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const scorerByIndex = scorerPredictions ?? [];
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
          {league?.lock_matches ? "Cerrado" : "Abierto"}
        </span>
      </div>
      <StageTabs
        items={[
          { href: "#partidos", label: "Partidos" },
          { href: "#grupos", label: "Grupos" },
          { href: "#goleadores", label: "Goleadores" },
          { href: "#premios", label: "Premios" },
          { href: "#resumen", label: "Resumen" },
        ]}
      />
      <section id="partidos" className="mt-6">
        <form action={saveMatchPredictionsAction} className="space-y-4">
          <input type="hidden" name="league_id" value={leagueId} />
          <input
            type="hidden"
            name="match_ids"
            value={matchRows.map((match) => match.id).join(",")}
          />
          {matchRows.map((match) => (
            <PredictionInput key={match.id} match={match} />
          ))}
          <button disabled={league?.lock_matches} className="btn-primary w-full">
            Apuestas guardadas correctamente
          </button>
        </form>
      </section>
      <section id="grupos" className="mt-10">
        <h2 className="text-2xl font-black">Grupos automáticos</h2>
        <p className="mt-2 text-slate-300">
          Esta es tu clasificación prevista según tus resultados.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {groupLetters.map((group) => (
            <div key={group} className="glass rounded-2xl p-4">
              <h3 className="mb-3 font-black">Grupo {group}</h3>
              <GroupStandingTable
                rows={calculatePredictedGroupStandings(
                  (teams ?? []) as Team[],
                  matchRows,
                  predictionRows,
                  group,
                )}
              />
            </div>
          ))}
        </div>
      </section>
      <section id="goleadores" className="mt-10">
        <form action={saveScorerPredictionsAction} className="glass rounded-3xl p-5">
          <input type="hidden" name="league_id" value={leagueId} />
          <h2 className="text-2xl font-black">Goleadores</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <label key={index}>
                <span className="label">Jugador {index + 1}</span>
                <PlayerSearchCombobox
                  name={`player_${index + 1}`}
                  players={players ?? []}
                  defaultValue={scorerByIndex[index]?.player_id}
                />
              </label>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="label">Capitán</span>
            <PlayerSearchCombobox
              name="captain_id"
              players={players ?? []}
              defaultValue={scorerByIndex.find((row) => row.is_captain)?.player_id}
            />
          </label>
          <button disabled={league?.lock_scorers} className="btn-primary mt-5 w-full">
            Guardar goleadores
          </button>
        </form>
      </section>
      <section id="premios" className="mt-10">
        <form action={saveAwardPredictionsAction} className="glass rounded-3xl p-5">
          <input type="hidden" name="league_id" value={leagueId} />
          <h2 className="text-2xl font-black">Premios</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <PlayerSearchCombobox name="top_scorer_player_id" players={players ?? []} defaultValue={awardPrediction?.top_scorer_player_id} />
            <PlayerSearchCombobox name="best_player_id" players={players ?? []} defaultValue={awardPrediction?.best_player_id} />
            <PlayerSearchCombobox name="best_goalkeeper_id" players={players ?? []} defaultValue={awardPrediction?.best_goalkeeper_id} />
            <PlayerSearchCombobox name="best_young_player_id" players={players ?? []} defaultValue={awardPrediction?.best_young_player_id} />
          </div>
          <button disabled={league?.lock_awards} className="btn-primary mt-5 w-full">
            Guardar premios
          </button>
        </form>
      </section>
      <section id="resumen" className="mt-10 glass rounded-3xl p-5">
        <h2 className="text-2xl font-black">Resumen final</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>Partidos completados: {completedMatches}/{matchRows.length}</div>
          <div>Goleadores elegidos: {scorerByIndex.length}/3</div>
          <div>Premios elegidos: {awardPrediction ? "4/4" : "0/4"}</div>
          <div>Eliminatorias completadas: pendiente</div>
        </div>
      </section>
    </UserLayout>
  );
}
