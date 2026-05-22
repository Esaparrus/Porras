import { updateLeagueLocksAction, updateLeagueSettingsAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { calculateLeaguePot, calculatePrizeBreakdown, formatCurrency } from "@/lib/league-insights";
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
  const [{ data: settings }, { data: league }, { count: memberCount }] = await Promise.all([
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .single(),
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("league_members")
      .select("*", { count: "exact", head: true })
      .eq("league_id", leagueId),
  ]);
  const values = { ...DEFAULT_POINT_SETTINGS, ...(settings ?? {}) } as Record<string, number>;
  const totalPot = league ? calculateLeaguePot(league, memberCount ?? 0) : 0;
  const prizes = league
    ? calculatePrizeBreakdown(league, totalPot)
    : { first: 0, second: 0, third: 0, remainder: 0 };

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
          <section className="glass rounded-3xl p-5">
            <h2 className="text-xl font-black">Bote y premios</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">Precio por jugador</span>
                <input
                  name="entry_price"
                  type="number"
                  min="0"
                  defaultValue={league?.entry_price ?? 0}
                  className="field mt-2"
                />
              </label>
              <label>
                <span className="label">Bote total manual</span>
                <input
                  name="pot_total_override"
                  type="number"
                  min="0"
                  defaultValue={league?.pot_total_override ?? ""}
                  className="field mt-2"
                />
              </label>
              <label>
                <span className="label">% primer puesto</span>
                <input
                  name="prize_first_percentage"
                  type="number"
                  min="0"
                  defaultValue={league?.prize_first_percentage ?? 60}
                  className="field mt-2"
                />
              </label>
              <label>
                <span className="label">% segundo puesto</span>
                <input
                  name="prize_second_percentage"
                  type="number"
                  min="0"
                  defaultValue={league?.prize_second_percentage ?? 30}
                  className="field mt-2"
                />
              </label>
              <label className="md:col-span-2">
                <span className="label">% tercer puesto</span>
                <input
                  name="prize_third_percentage"
                  type="number"
                  min="0"
                  defaultValue={league?.prize_third_percentage ?? 10}
                  className="field mt-2"
                />
              </label>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-sm text-slate-300">Jugadores</div>
                <div className="mt-1 text-2xl font-black">{memberCount ?? 0}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-sm text-slate-300">Bote actual</div>
                <div className="mt-1 text-2xl font-black text-[#27e7ff]">
                  {formatCurrency(totalPot)}
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-sm text-slate-300">Top 3</div>
                <div className="mt-1 text-sm font-black text-white">
                  {formatCurrency(prizes.first)} / {formatCurrency(prizes.second)} / {formatCurrency(prizes.third)}
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-sm text-slate-300">Sin repartir</div>
                <div className="mt-1 text-2xl font-black">{formatCurrency(prizes.remainder)}</div>
              </div>
            </div>
          </section>
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
            Guardar puntos y bote
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
