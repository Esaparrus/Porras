import type { PointSettings } from "@/lib/types";

export const POINT_SETTING_GROUPS = [
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
] as const satisfies ReadonlyArray<
  readonly [string, readonly (keyof Omit<PointSettings, "id" | "league_id">)[]]
>;

export const POINT_SETTING_LABELS: Record<
  keyof Omit<PointSettings, "id" | "league_id">,
  string
> = {
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
