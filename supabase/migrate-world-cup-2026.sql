do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'third_place'
      and enumtypid = 'public.match_stage'::regtype
  ) then
    alter type public.match_stage add value 'third_place' before 'final';
  end if;
end $$;

alter table public.teams
  add column if not exists flag_code text,
  add column if not exists fair_play_points int default 0,
  add column if not exists manual_order int;

alter table public.players
  add column if not exists scorer_rank int;

alter table public.matches
  add column if not exists match_number int,
  add column if not exists home_placeholder text,
  add column if not exists away_placeholder text,
  add column if not exists winner_team_id uuid references public.teams(id),
  add column if not exists venue text;

create unique index if not exists teams_short_name_unique_idx
  on public.teams (short_name);

create unique index if not exists players_team_id_name_unique_idx
  on public.players (team_id, name);

create unique index if not exists matches_match_number_unique_idx
  on public.matches (match_number);
