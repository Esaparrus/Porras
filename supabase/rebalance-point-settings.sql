alter table public.league_point_settings
  alter column group_exact_position_points set default 1,
  alter column group_winner_bonus_points set default 2,
  alter column group_qualified_team_points set default 1,
  alter column best_third_team_points set default 1,
  alter column knockout_round_32_reached_points set default 1,
  alter column knockout_round_16_reached_points set default 2,
  alter column knockout_quarter_reached_points set default 3,
  alter column knockout_semi_reached_points set default 5,
  alter column knockout_final_reached_points set default 8,
  alter column knockout_champion_points set default 30,
  alter column scorer_max_points set default 40,
  alter column award_top_scorer_points set default 12,
  alter column award_best_player_points set default 10,
  alter column award_best_goalkeeper_points set default 6,
  alter column award_best_young_player_points set default 6;

update public.league_point_settings
set
  group_exact_position_points = 1,
  group_winner_bonus_points = 2,
  group_qualified_team_points = 1,
  best_third_team_points = 1,
  knockout_round_32_reached_points = 1,
  knockout_round_16_reached_points = 2,
  knockout_quarter_reached_points = 3,
  knockout_semi_reached_points = 5,
  knockout_final_reached_points = 8,
  knockout_champion_points = 30,
  scorer_max_points = 40,
  award_top_scorer_points = 12,
  award_best_player_points = 10,
  award_best_goalkeeper_points = 6,
  award_best_young_player_points = 6
where
  group_exact_position_points = 2
  and group_winner_bonus_points = 3
  and group_qualified_team_points = 2
  and best_third_team_points = 3
  and knockout_round_32_reached_points = 2
  and knockout_round_16_reached_points = 3
  and knockout_quarter_reached_points = 5
  and knockout_semi_reached_points = 8
  and knockout_final_reached_points = 12
  and knockout_champion_points = 30
  and scorer_max_points = 50
  and award_top_scorer_points = 25
  and award_best_player_points = 18
  and award_best_goalkeeper_points = 12
  and award_best_young_player_points = 10;
