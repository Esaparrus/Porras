import { updateLeagueLocksAction, updateLeagueSettingsAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { DEFAULT_POINT_SETTINGS, STATUS_LABELS } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";

const groups = [
  ["Partidos", ["match_exact_score_points", "match_sign_points"]],
  [
    "Grupos",
    [
      "group_exact_position_points",
      "group_winner_bonus_points",
      "group_qualified_team_points",
      "best_third_team_points",
    ],
  ],
  [
    "Cuadro inicial",
    [
      "knockout_round_32_reached_points",
      "knockout_round_16_reached_points",
      "knockout_quarter_reached_points",
      "knockout_semi_reached_points",
      "knockout_final_reached_points",
      "knockout_champion_points",
    ],
  ],
  [
    "Eliminatorias en vivo",
    [
      "live_round_32_winner_points",
      "live_round_32_exact_score_bonus",
      "live_round_16_winner_points",
      "live_round_16_exact_score_bonus",
      "live_quarter_winner_points",
      "live_quarter_exact_score_bonus",
      "live_semi_winner_points",
      "live_semi_exact_score_bonus",
      "live_final_winner_points",
      "live_final_exact_score_bonus",
    ],
  ],
  [
    "Goleadores",
    ["scorer_goal_points", "scorer_captain_extra_goal_points", "scorer_max_points"],
  ],
  [
    "Premios",
    [
      "award_top_scorer_points",
      "award_best_player_points",
      "award_best_goalkeeper_points",
      "award_best_young_player_points",
    ],
  ],
] as const;

const labels: Record<string, string> = {
  match_exact_score_points: "Resultado exacto",
  match_sign_points: "Signo 1/X/2",
  group_exact_position_points: "Posición exacta",
  group_winner_bonus_points: "Ganador de grupo",
  group_qualified_team_points: "Clasificado",
  best_third_team_points: "Mejor tercero",
  knockout_round_32_reached_points: "Llega a dieciseisavos",
  knockout_round_16_reached_points: "Llega a octavos",
  knockout_quarter_reached_points: "Llega a cuartos",
  knockout_semi_reached_points: "Llega a semifinales",
  knockout_final_reached_points: "Llega a la final",
  knockout_champion_points: "Campeón",
  live_round_32_winner_points: "Dieciseisavos clasificado",
  live_round_32_exact_score_bonus: "Dieciseisavos exacto",
  live_round_16_winner_points: "Octavos clasificado",
  live_round_16_exact_score_bonus: "Octavos exacto",
  live_quarter_winner_points: "Cuartos clasificado",
  live_quarter_exact_score_bonus: "Cuartos exacto",
  live_semi_winner_points: "Semis clasificado",
  live_semi_exact_score_bonus: "Semis exacto",
  live_final_winner_points: "Final campeón",
  live_final_exact_score_bonus: "Final exacto",
  scorer_goal_points: "Gol",
  scorer_captain_extra_goal_points: "Extra capitán",
  scorer_max_points: "Máximo goleadores",
  award_top_scorer_points: "Pichichi",
  award_best_player_points: "Mejor jugador",
  award_best_goalkeeper_points: "Mejor portero",
  award_best_young_player_points: "Mejor joven",
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: settings }, { data: league }] = await Promise.all([
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .single(),
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
  ]);
  const values = { ...DEFAULT_POINT_SETTINGS, ...(settings ?? {}) } as Record<string, number>;

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Ajustes de liga</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form action={updateLeagueLocksAction} className="glass rounded-3xl p-5">
          <input type="hidden" name="league_id" value={leagueId} />
          <h2 className="text-xl font-black">Bloqueos y visibilidad</h2>
          <label className="mt-4 block">
            <span className="label">Estado</span>
            <select name="status" defaultValue={league?.status} className="field mt-2">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {[
            ["predictions_visible", "Ver apuestas de otros"],
            ["lock_matches", "Cerrar partidos"],
            ["lock_scorers", "Cerrar goleadores"],
            ["lock_awards", "Cerrar premios"],
            ["lock_knockouts", "Cerrar eliminatorias"],
          ].map(([name, label]) => (
            <label key={name} className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                name={name}
                defaultChecked={Boolean(league?.[name])}
                className="h-5 w-5"
              />
              <span className="font-semibold">{label}</span>
            </label>
          ))}
          <button className="btn-primary mt-6 w-full">Guardar bloqueos</button>
        </form>

        <form action={updateLeagueSettingsAction} className="space-y-5">
          <input type="hidden" name="league_id" value={leagueId} />
          {groups.map(([title, keys]) => (
            <section key={title} className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black">{title}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {keys.map((key) => (
                  <label key={key}>
                    <span className="label">{labels[key]}</span>
                    <input
                      name={key}
                      type="number"
                      defaultValue={values[key]}
                      className="field mt-2"
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
          <button className="btn-primary w-full">
            Puntuación actualizada correctamente
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
