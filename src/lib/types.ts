export type Role = "admin" | "player";
export type LeagueStatus = "open" | "locked" | "in_progress" | "finished";
export type Stage =
  | "group"
  | "round_32"
  | "round_16"
  | "quarter_final"
  | "semi_final"
  | "final";
export type KnockoutRound =
  | "round_32"
  | "round_16"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "champion";

export type Profile = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: Role;
  created_at: string;
};

export type League = {
  id: string;
  name: string;
  code: string;
  status: LeagueStatus;
  predictions_visible: boolean;
  lock_matches: boolean;
  lock_scorers: boolean;
  lock_awards: boolean;
  lock_knockouts: boolean;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  short_name: string;
  flag_emoji: string;
  group_letter: string | null;
  fifa_ranking: number | null;
  manual_order: number | null;
  fair_play_points?: number | null;
};

export type Player = {
  id: string;
  name: string;
  team_id: string;
  position: string | null;
  is_star: boolean;
  is_active: boolean;
  teams?: Team;
};

export type Match = {
  id: string;
  stage: Stage;
  group_letter: string | null;
  home_team_id: string;
  away_team_id: string;
  match_date: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  is_locked: boolean;
  created_at: string;
  home_team?: Team;
  away_team?: Team;
};

export type MatchPrediction = {
  id: string;
  league_id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_winner_team_id: string | null;
  points: number;
};

export type PointSettings = {
  id?: string;
  league_id: string;
  match_exact_score_points: number;
  match_sign_points: number;
  group_exact_position_points: number;
  group_winner_bonus_points: number;
  group_qualified_team_points: number;
  best_third_team_points: number;
  knockout_round_32_reached_points: number;
  knockout_round_16_reached_points: number;
  knockout_quarter_reached_points: number;
  knockout_semi_reached_points: number;
  knockout_final_reached_points: number;
  knockout_champion_points: number;
  live_round_32_winner_points: number;
  live_round_32_exact_score_bonus: number;
  live_round_16_winner_points: number;
  live_round_16_exact_score_bonus: number;
  live_quarter_winner_points: number;
  live_quarter_exact_score_bonus: number;
  live_semi_winner_points: number;
  live_semi_exact_score_bonus: number;
  live_final_winner_points: number;
  live_final_exact_score_bonus: number;
  scorer_goal_points: number;
  scorer_captain_extra_goal_points: number;
  scorer_max_points: number;
  award_top_scorer_points: number;
  award_best_player_points: number;
  award_best_goalkeeper_points: number;
  award_best_young_player_points: number;
};

export type Score = {
  id: string;
  league_id: string;
  user_id: string;
  total_points: number;
  match_points: number;
  group_points: number;
  knockout_points: number;
  scorer_points: number;
  award_points: number;
  exact_scores_count: number;
  champion_hit: boolean;
  updated_at: string;
  profiles?: Profile;
};

export type StandingRow = {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};
