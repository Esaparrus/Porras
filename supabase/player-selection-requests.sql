create table if not exists public.player_selection_requests (
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

alter table public.player_selection_requests enable row level security;

drop policy if exists "player selection requests own" on public.player_selection_requests;

create policy "player selection requests own" on public.player_selection_requests
for all using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());
