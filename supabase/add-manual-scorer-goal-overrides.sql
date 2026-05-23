alter table public.league_player_goals
  add column if not exists manual_goals_override int;
