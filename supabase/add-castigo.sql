-- Castigo (broma): marca por usuario+liga. Cuando esta a true, al entrar a la
-- liga se le redirige a /castigo (la pizarra) hasta que la complete.
-- Migracion aditiva y segura: no rompe lecturas/escrituras existentes.
alter table public.league_members
  add column if not exists castigo_pending boolean not null default false;
