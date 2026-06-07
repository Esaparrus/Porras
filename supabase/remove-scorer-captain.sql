drop index if exists public.one_captain_per_user_league;

alter table public.scorer_predictions
  drop column if exists is_captain;

alter table public.league_point_settings
  drop column if exists scorer_captain_extra_goal_points;
