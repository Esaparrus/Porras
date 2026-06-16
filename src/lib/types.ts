export type Role = "admin" | "player";
export type LeagueStatus = "open" | "locked" | "in_progress" | "finished";
export type LeaguePaymentStatus = "paid" | "pending";
export type Stage =
  | "group"
  | "round_32"
  | "round_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
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
  avatar_emoji?: string | null;
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
  entry_price: number;
  pot_total_override: number | null;
  prize_first_percentage: number;
  prize_second_percentage: number;
  prize_third_percentage: number;
  created_at: string;
  updated_at: string;
};

export type LeagueMember = {
  id: string;
  league_id: string;
  user_id: string;
  payment_status: LeaguePaymentStatus;
  joined_at: string;
  castigo_pending: boolean;
};

export type Team = {
  id: string;
  name: string;
  short_name: string;
  flag_emoji: string;
  flag_code: string | null;
  group_letter: string | null;
  fifa_ranking: number | null;
  manual_order: number | null;
  fair_play_points?: number | null;
  api_football_team_id?: number | null;
};

export type Player = {
  id: string;
  name: string;
  team_id: string;
  position: string | null;
  is_star: boolean;
  is_active: boolean;
  scorer_rank?: number | null;
  api_football_player_id?: number | null;
  teams?: Team;
};

export type ScorerSuggestionStatus = "pending" | "applied" | "dismissed";

export type MatchScorerSuggestion = {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  api_player_id: number | null;
  api_player_name: string;
  goals: number;
  is_own_goal: boolean;
  status: ScorerSuggestionStatus;
  created_at: string;
  updated_at: string;
};

export type ApiFootballSyncLog = {
  id: string;
  ran_at: string;
  source: string;
  ok: boolean;
  checked: number;
  updated: number;
  skipped: number;
  suggestions: number;
  messages: string[];
  error: string | null;
};

export type MatchScorer = {
  id: string;
  match_id: string;
  player_id: string;
  goals: number;
  created_at: string;
  players?: Player;
};

export type PlayerSelectionRequestStatus = "pending" | "approved" | "rejected";

export type PlayerSelectionRequest = {
  id: string;
  league_id: string;
  user_id: string;
  field_key: string;
  player_name: string;
  team_id: string | null;
  status: PlayerSelectionRequestStatus;
  resolved_player_id: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  teams?: Team | null;
  profiles?: Profile | null;
  resolved_player?: Player | null;
};

export type Match = {
  id: string;
  match_number: number | null;
  stage: Stage;
  group_letter: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  winner_team_id: string | null;
  match_date: string | null;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  api_football_fixture_id?: number | null;
  api_football_last_sync_at?: string | null;
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

export type PredictionTiebreakScopeType = "group" | "best_third";

export type PredictionTiebreakSelection = {
  id: string;
  league_id: string;
  user_id: string;
  scope_type: PredictionTiebreakScopeType;
  scope_key: string;
  team_id: string;
  rank: number;
  created_at: string;
};

export type PointSettings = {
  id?: string;
  league_id: string;
  match_exact_score_points: number;
  match_goal_difference_points: number;
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
  knockout_runner_up_points: number;
  knockout_third_place_points: number;
  live_round_32_sign_points: number;
  live_round_32_winner_points: number;
  live_round_32_goal_difference_points: number;
  live_round_32_exact_score_bonus: number;
  live_round_16_sign_points: number;
  live_round_16_winner_points: number;
  live_round_16_goal_difference_points: number;
  live_round_16_exact_score_bonus: number;
  live_quarter_sign_points: number;
  live_quarter_winner_points: number;
  live_quarter_goal_difference_points: number;
  live_quarter_exact_score_bonus: number;
  live_semi_sign_points: number;
  live_semi_winner_points: number;
  live_semi_goal_difference_points: number;
  live_semi_exact_score_bonus: number;
  live_third_place_sign_points: number;
  live_third_place_winner_points: number;
  live_third_place_goal_difference_points: number;
  live_third_place_exact_score_bonus: number;
  live_final_sign_points: number;
  live_final_winner_points: number;
  live_final_goal_difference_points: number;
  live_final_exact_score_bonus: number;
  scorer_goal_points: number;
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
