create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'player');
create type public.league_status as enum ('open', 'locked', 'in_progress', 'finished');
create type public.league_payment_status as enum ('paid', 'pending');
create type public.match_stage as enum ('group', 'round_32', 'round_16', 'quarter_final', 'semi_final', 'third_place', 'final');
create type public.knockout_round as enum ('round_32', 'round_16', 'quarter_final', 'semi_final', 'final', 'champion');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique,
  display_name text not null,
  role public.user_role not null default 'player',
  created_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  status public.league_status not null default 'open',
  predictions_visible boolean not null default false,
  lock_matches boolean not null default false,
  lock_scorers boolean not null default false,
  lock_awards boolean not null default false,
  lock_knockouts boolean not null default false,
  entry_price int not null default 0,
  pot_total_override int,
  prize_first_percentage int not null default 60,
  prize_second_percentage int not null default 30,
  prize_third_percentage int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_status public.league_payment_status not null default 'pending',
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  flag_emoji text not null,
  flag_code text,
  group_letter text,
  fifa_ranking int,
  fair_play_points int default 0,
  manual_order int,
  unique (short_name)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  position text,
  is_star boolean not null default false,
  is_active boolean not null default true,
  scorer_rank int,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number int unique,
  stage public.match_stage not null,
  group_letter text,
  home_team_id uuid references public.teams(id),
  away_team_id uuid references public.teams(id),
  home_placeholder text,
  away_placeholder text,
  winner_team_id uuid references public.teams(id),
  match_date timestamptz,
  venue text,
  home_score int,
  away_score int,
  is_finished boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score int,
  predicted_away_score int,
  predicted_winner_team_id uuid references public.teams(id),
  points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id, match_id)
);

create table public.knockout_predictions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  round public.knockout_round not null,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique (league_id, user_id, team_id, round)
);

create table public.scorer_predictions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_captain boolean not null default false,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique (league_id, user_id, player_id)
);

create unique index one_captain_per_user_league
on public.scorer_predictions (league_id, user_id)
where is_captain;

create table public.award_predictions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  top_scorer_player_id uuid references public.players(id),
  best_player_id uuid references public.players(id),
  best_goalkeeper_id uuid references public.players(id),
  best_young_player_id uuid references public.players(id),
  points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table public.player_selection_requests (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  field_key text not null,
  player_name text not null,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_player_id uuid references public.players(id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id, field_key)
);

create table public.match_scorers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  goals int not null default 1,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table public.league_player_goals (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  goals int not null default 0,
  manual_goals_override int,
  updated_at timestamptz not null default now(),
  unique (league_id, player_id)
);

create table public.final_awards (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null unique references public.leagues(id) on delete cascade,
  top_scorer_player_id uuid references public.players(id),
  best_player_id uuid references public.players(id),
  best_goalkeeper_id uuid references public.players(id),
  best_young_player_id uuid references public.players(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.league_point_settings (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null unique references public.leagues(id) on delete cascade,
  match_exact_score_points int not null default 4,
  match_sign_points int not null default 1,
  group_exact_position_points int not null default 2,
  group_winner_bonus_points int not null default 3,
  group_qualified_team_points int not null default 2,
  best_third_team_points int not null default 3,
  knockout_round_32_reached_points int not null default 2,
  knockout_round_16_reached_points int not null default 3,
  knockout_quarter_reached_points int not null default 5,
  knockout_semi_reached_points int not null default 8,
  knockout_final_reached_points int not null default 12,
  knockout_champion_points int not null default 30,
  live_round_32_winner_points int not null default 2,
  live_round_32_exact_score_bonus int not null default 3,
  live_round_16_winner_points int not null default 3,
  live_round_16_exact_score_bonus int not null default 3,
  live_quarter_winner_points int not null default 4,
  live_quarter_exact_score_bonus int not null default 4,
  live_semi_winner_points int not null default 5,
  live_semi_exact_score_bonus int not null default 4,
  live_final_winner_points int not null default 8,
  live_final_exact_score_bonus int not null default 5,
  scorer_goal_points int not null default 2,
  scorer_captain_extra_goal_points int not null default 1,
  scorer_max_points int not null default 50,
  award_top_scorer_points int not null default 25,
  award_best_player_points int not null default 18,
  award_best_goalkeeper_points int not null default 12,
  award_best_young_player_points int not null default 10
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_points int not null default 0,
  match_points int not null default 0,
  group_points int not null default 0,
  knockout_points int not null default 0,
  scorer_points int not null default 0,
  award_points int not null default 0,
  exact_scores_count int not null default 0,
  champion_hit boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete set null,
  admin_user_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  action_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_leagues before update on public.leagues
for each row execute function public.touch_updated_at();

create trigger touch_match_predictions before update on public.match_predictions
for each row execute function public.touch_updated_at();

create trigger touch_award_predictions before update on public.award_predictions
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_league_member(target_league uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.league_members
    where league_id = target_league and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_predictions enable row level security;
alter table public.knockout_predictions enable row level security;
alter table public.scorer_predictions enable row level security;
alter table public.award_predictions enable row level security;
alter table public.match_scorers enable row level security;
alter table public.league_player_goals enable row level security;
alter table public.final_awards enable row level security;
alter table public.league_point_settings enable row level security;
alter table public.scores enable row level security;
alter table public.admin_logs enable row level security;
alter table public.player_selection_requests enable row level security;

create policy "profiles self or admin read" on public.profiles
for select using (id = auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles
for update using (id = auth.uid() or public.is_admin());

create policy "leagues member read" on public.leagues
for select using (public.is_admin() or public.is_league_member(id));
create policy "leagues admin all" on public.leagues
for all using (public.is_admin()) with check (public.is_admin());

create policy "league members read" on public.league_members
for select using (public.is_admin() or user_id = auth.uid() or public.is_league_member(league_id));
create policy "league members admin all" on public.league_members
for all using (public.is_admin()) with check (public.is_admin());

create policy "teams read authenticated" on public.teams
for select to authenticated using (true);
create policy "teams admin all" on public.teams
for all using (public.is_admin()) with check (public.is_admin());

create policy "players read authenticated" on public.players
for select to authenticated using (true);
create policy "players admin all" on public.players
for all using (public.is_admin()) with check (public.is_admin());

create policy "matches read authenticated" on public.matches
for select to authenticated using (true);
create policy "matches admin all" on public.matches
for all using (public.is_admin()) with check (public.is_admin());

create policy "match predictions own" on public.match_predictions
for all using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());
create policy "match predictions visible read" on public.match_predictions
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.leagues l
    where l.id = league_id
    and public.is_league_member(l.id)
    and (l.predictions_visible or l.status <> 'open')
  )
);

create policy "knockout predictions own" on public.knockout_predictions
for all using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy "scorer predictions own" on public.scorer_predictions
for all using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy "award predictions own" on public.award_predictions
for all using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy "player selection requests own" on public.player_selection_requests
for all using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy "match scorers read" on public.match_scorers
for select to authenticated using (true);
create policy "match scorers admin all" on public.match_scorers
for all using (public.is_admin()) with check (public.is_admin());

create policy "league player goals read" on public.league_player_goals
for select using (public.is_admin() or public.is_league_member(league_id));
create policy "league player goals admin all" on public.league_player_goals
for all using (public.is_admin()) with check (public.is_admin());

create policy "final awards read" on public.final_awards
for select using (public.is_admin() or public.is_league_member(league_id));
create policy "final awards admin all" on public.final_awards
for all using (public.is_admin()) with check (public.is_admin());

create policy "point settings read" on public.league_point_settings
for select using (public.is_admin() or public.is_league_member(league_id));
create policy "point settings admin all" on public.league_point_settings
for all using (public.is_admin()) with check (public.is_admin());

create policy "scores read" on public.scores
for select using (public.is_admin() or public.is_league_member(league_id));
create policy "scores admin all" on public.scores
for all using (public.is_admin()) with check (public.is_admin());

create policy "logs admin read" on public.admin_logs
for select using (public.is_admin());
create policy "logs admin insert" on public.admin_logs
for insert with check (public.is_admin());
