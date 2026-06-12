-- Sincronizacion opcional de goleadores desde API-Football (modo propuesta).
-- No escribe goles directamente: deja sugerencias que el admin confirma a mano.

alter table public.players
  add column if not exists api_football_player_id int;

create unique index if not exists players_api_football_player_id_unique_idx
  on public.players (api_football_player_id)
  where api_football_player_id is not null;

-- Sugerencias de goleadores detectadas por la API. El admin las aplica o descarta.
create table if not exists public.match_scorer_suggestions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  api_player_id int,
  api_player_name text not null,
  goals int not null default 1,
  is_own_goal boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, api_player_name)
);

alter table public.match_scorer_suggestions enable row level security;

drop policy if exists "scorer suggestions admin all" on public.match_scorer_suggestions;
create policy "scorer suggestions admin all" on public.match_scorer_suggestions
for all using (public.is_admin()) with check (public.is_admin());

-- Historial de ejecuciones del sync, visible para el admin (fallback/auditoria).
create table if not exists public.api_football_sync_logs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  source text not null default 'cron',
  ok boolean not null default true,
  checked int not null default 0,
  updated int not null default 0,
  skipped int not null default 0,
  suggestions int not null default 0,
  messages jsonb not null default '[]'::jsonb,
  error text
);

alter table public.api_football_sync_logs enable row level security;

drop policy if exists "sync logs admin read" on public.api_football_sync_logs;
create policy "sync logs admin read" on public.api_football_sync_logs
for select using (public.is_admin());

drop policy if exists "sync logs admin all" on public.api_football_sync_logs;
create policy "sync logs admin all" on public.api_football_sync_logs
for all using (public.is_admin()) with check (public.is_admin());
