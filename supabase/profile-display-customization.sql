alter table public.profiles
add column if not exists avatar_emoji text;

drop policy if exists "profiles league members read" on public.profiles;

create policy "profiles league members read" on public.profiles
for select using (
  exists (
    select 1
    from public.league_members current_member
    join public.league_members target_member
      on target_member.league_id = current_member.league_id
    where current_member.user_id = auth.uid()
      and target_member.user_id = profiles.id
  )
);
