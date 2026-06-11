-- Permite que los miembros de una liga lean los goleadores, premios y
-- desempates de OTROS jugadores cuando las apuestas ya son visibles
-- (misma regla que match_predictions: predictions_visible, liga no abierta,
-- o ya hay algun partido finalizado). Hasta ahora solo existia la politica
-- "own", asi que al ver las apuestas de otro usuario RLS devolvia vacio y los
-- apartados de Goleadores / Premios / desempates salian en blanco.

create policy "scorer predictions visible read" on public.scorer_predictions
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.leagues l
    where l.id = league_id
    and public.is_league_member(l.id)
    and (
      l.predictions_visible
      or l.status <> 'open'
      or exists (select 1 from public.matches m where m.is_finished)
    )
  )
);

create policy "award predictions visible read" on public.award_predictions
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.leagues l
    where l.id = league_id
    and public.is_league_member(l.id)
    and (
      l.predictions_visible
      or l.status <> 'open'
      or exists (select 1 from public.matches m where m.is_finished)
    )
  )
);

create policy "prediction tiebreak selections visible read" on public.prediction_tiebreak_selections
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.leagues l
    where l.id = league_id
    and public.is_league_member(l.id)
    and (
      l.predictions_visible
      or l.status <> 'open'
      or exists (select 1 from public.matches m where m.is_finished)
    )
  )
);
