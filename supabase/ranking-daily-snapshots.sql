create table if not exists public.ranking_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null,
  position int not null check (position > 0),
  total_points int not null default 0,
  exact_scores_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (league_id, snapshot_date, user_id)
);

create index if not exists ranking_daily_snapshots_league_date_idx
on public.ranking_daily_snapshots (league_id, snapshot_date desc, position asc);

alter table public.ranking_daily_snapshots enable row level security;

drop policy if exists "ranking snapshots read" on public.ranking_daily_snapshots;
create policy "ranking snapshots read" on public.ranking_daily_snapshots
for select using (public.is_admin() or public.is_league_member(league_id));

drop policy if exists "ranking snapshots admin all" on public.ranking_daily_snapshots;
create policy "ranking snapshots admin all" on public.ranking_daily_snapshots
for all using (public.is_admin()) with check (public.is_admin());
