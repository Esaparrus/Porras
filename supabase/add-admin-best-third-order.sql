-- Orden manual del admin para resolver empates REALES de mejores terceros.
-- Es global (un unico ranking para todo el Mundial), a diferencia de
-- prediction_tiebreak_selections que es por usuario. Solo se guardan los equipos
-- empatados que el admin ordena: manual_order actua como desempate residual.
create table if not exists public.admin_best_third_order (
  team_id uuid primary key references public.teams(id) on delete cascade,
  rank int not null check (rank > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_best_third_order enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_best_third_order'
      and policyname = 'admin best third order admin only'
  ) then
    create policy "admin best third order admin only" on public.admin_best_third_order
    for all using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;
