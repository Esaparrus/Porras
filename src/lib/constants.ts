import type { PointSettings } from "@/lib/types";

export const DEFAULT_POINT_SETTINGS: Omit<PointSettings, "id" | "league_id"> = {
  match_exact_score_points: 3,
  match_goal_difference_points: 3,
  match_sign_points: 2,
  group_exact_position_points: 3,
  group_winner_bonus_points: 0,
  group_qualified_team_points: 5,
  best_third_team_points: 5,
  knockout_round_32_reached_points: 5,
  knockout_round_16_reached_points: 8,
  knockout_quarter_reached_points: 12,
  knockout_semi_reached_points: 18,
  knockout_final_reached_points: 25,
  knockout_champion_points: 60,
  knockout_runner_up_points: 35,
  knockout_third_place_points: 20,
  live_round_32_sign_points: 4,
  live_round_32_winner_points: 8,
  live_round_32_goal_difference_points: 4,
  live_round_32_exact_score_bonus: 2,
  live_round_16_sign_points: 4,
  live_round_16_winner_points: 12,
  live_round_16_goal_difference_points: 4,
  live_round_16_exact_score_bonus: 2,
  live_quarter_sign_points: 4,
  live_quarter_winner_points: 18,
  live_quarter_goal_difference_points: 4,
  live_quarter_exact_score_bonus: 2,
  live_semi_sign_points: 4,
  live_semi_winner_points: 25,
  live_semi_goal_difference_points: 4,
  live_semi_exact_score_bonus: 2,
  live_third_place_sign_points: 4,
  live_third_place_winner_points: 0,
  live_third_place_goal_difference_points: 4,
  live_third_place_exact_score_bonus: 2,
  live_final_sign_points: 6,
  live_final_winner_points: 0,
  live_final_goal_difference_points: 6,
  live_final_exact_score_bonus: 4,
  scorer_goal_points: 2,
  scorer_max_points: 40,
  award_top_scorer_points: 25,
  award_best_player_points: 25,
  award_best_goalkeeper_points: 15,
  award_best_young_player_points: 15,
};

export const STAGE_LABELS: Record<string, string> = {
  group: "Fase de grupos",
  round_32: "Dieciseisavos",
  round_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "abierta",
  locked: "bloqueada",
  in_progress: "en curso",
  finished: "finalizada",
};

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@porra.local";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";
