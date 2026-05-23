drop policy if exists "match predictions visible read" on public.match_predictions;

create policy "match predictions visible read" on public.match_predictions
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
      or exists (
        select 1 from public.matches m
        where m.is_finished
      )
    )
  )
);
