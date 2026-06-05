create table if not exists public.prediction_tiebreak_selections (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope_type text not null check (scope_type in ('group', 'best_third')),
  scope_key text not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  rank int not null check (rank > 0),
  created_at timestamptz not null default now(),
  unique (league_id, user_id, scope_type, scope_key, team_id)
);

alter table public.prediction_tiebreak_selections enable row level security;

create policy "prediction tiebreak selections own" on public.prediction_tiebreak_selections
for all using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());
