do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'league_payment_status'
  ) then
    create type public.league_payment_status as enum ('paid', 'pending');
  end if;
end
$$;

alter table public.leagues
  add column if not exists entry_price int not null default 0,
  add column if not exists pot_total_override int,
  add column if not exists prize_first_percentage int not null default 60,
  add column if not exists prize_second_percentage int not null default 30,
  add column if not exists prize_third_percentage int not null default 10;

alter table public.league_members
  add column if not exists payment_status public.league_payment_status not null default 'pending';
