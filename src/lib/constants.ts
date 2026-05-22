import type { PointSettings } from "@/lib/types";

export const DEFAULT_POINT_SETTINGS: Omit<PointSettings, "id" | "league_id"> = {
  match_exact_score_points: 4,
  match_sign_points: 1,
  group_exact_position_points: 2,
  group_winner_bonus_points: 3,
  group_qualified_team_points: 2,
  best_third_team_points: 3,
  knockout_round_32_reached_points: 2,
  knockout_round_16_reached_points: 3,
  knockout_quarter_reached_points: 5,
  knockout_semi_reached_points: 8,
  knockout_final_reached_points: 12,
  knockout_champion_points: 30,
  live_round_32_winner_points: 2,
  live_round_32_exact_score_bonus: 3,
  live_round_16_winner_points: 3,
  live_round_16_exact_score_bonus: 3,
  live_quarter_winner_points: 4,
  live_quarter_exact_score_bonus: 4,
  live_semi_winner_points: 5,
  live_semi_exact_score_bonus: 4,
  live_final_winner_points: 8,
  live_final_exact_score_bonus: 5,
  scorer_goal_points: 2,
  scorer_captain_extra_goal_points: 1,
  scorer_max_points: 50,
  award_top_scorer_points: 25,
  award_best_player_points: 18,
  award_best_goalkeeper_points: 12,
  award_best_young_player_points: 10,
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
