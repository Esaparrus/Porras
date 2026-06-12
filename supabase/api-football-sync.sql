alter table public.teams
  add column if not exists api_football_team_id int;

alter table public.matches
  add column if not exists api_football_fixture_id int,
  add column if not exists api_football_last_sync_at timestamptz;

create unique index if not exists teams_api_football_team_id_unique_idx
  on public.teams (api_football_team_id)
  where api_football_team_id is not null;

create unique index if not exists matches_api_football_fixture_id_unique_idx
  on public.matches (api_football_fixture_id)
  where api_football_fixture_id is not null;
