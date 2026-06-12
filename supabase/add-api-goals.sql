-- Total de goles por jugador segun la API (football-data). Se usa como fuente
-- de los goleadores cuando el proveedor no da el detalle gol-a-gol. El override
-- manual del admin (league_player_goals.manual_goals_override) siempre manda.
alter table public.players
  add column if not exists api_goals int;
