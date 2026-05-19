alter table public.profiles
add column if not exists username text;

update public.profiles
set username = lower(split_part(email, '@', 1))
where username is null;

alter table public.profiles
alter column username set not null;

create unique index if not exists profiles_username_key
on public.profiles (username);
