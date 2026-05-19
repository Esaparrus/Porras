insert into public.teams (name, short_name, flag_emoji, group_letter, fifa_ranking, manual_order) values
('España', 'ESP', '🇪🇸', 'A', 8, 1),
('Japón', 'JPN', '🇯🇵', 'A', 18, 2),
('Alemania', 'GER', '🇩🇪', 'A', 10, 3),
('Marruecos', 'MAR', '🇲🇦', 'A', 12, 4),
('Francia', 'FRA', '🇫🇷', 'B', 2, 1),
('Brasil', 'BRA', '🇧🇷', 'B', 5, 2),
('Estados Unidos', 'USA', '🇺🇸', 'B', 13, 3),
('Corea del Sur', 'KOR', '🇰🇷', 'B', 22, 4),
('Argentina', 'ARG', '🇦🇷', 'C', 1, 1),
('Inglaterra', 'ENG', '🏴', 'C', 4, 2),
('Portugal', 'POR', '🇵🇹', 'C', 6, 3),
('Uruguay', 'URU', '🇺🇾', 'C', 15, 4),
('Países Bajos', 'NED', '🇳🇱', 'D', 7, 1),
('Bélgica', 'BEL', '🇧🇪', 'D', 9, 2),
('México', 'MEX', '🇲🇽', 'D', 14, 3),
('Colombia', 'COL', '🇨🇴', 'D', 11, 4)
on conflict do nothing;

insert into public.players (name, team_id, position, is_star)
select 'Kylian Mbappé', id, 'FW', true from public.teams where short_name = 'FRA'
union all select 'Harry Kane', id, 'FW', true from public.teams where short_name = 'ENG'
union all select 'Lionel Messi', id, 'FW', true from public.teams where short_name = 'ARG'
union all select 'Vinícius Jr', id, 'FW', true from public.teams where short_name = 'BRA'
union all select 'Jude Bellingham', id, 'MF', true from public.teams where short_name = 'ENG'
union all select 'Julián Álvarez', id, 'FW', true from public.teams where short_name = 'ARG'
union all select 'Lautaro Martínez', id, 'FW', true from public.teams where short_name = 'ARG'
union all select 'Rodrygo', id, 'FW', true from public.teams where short_name = 'BRA'
union all select 'Neymar', id, 'FW', true from public.teams where short_name = 'BRA'
union all select 'Antoine Griezmann', id, 'FW', true from public.teams where short_name = 'FRA'
union all select 'Jamal Musiala', id, 'MF', true from public.teams where short_name = 'GER'
union all select 'Florian Wirtz', id, 'MF', true from public.teams where short_name = 'GER'
union all select 'Bukayo Saka', id, 'FW', true from public.teams where short_name = 'ENG'
union all select 'Phil Foden', id, 'MF', true from public.teams where short_name = 'ENG'
union all select 'Lamine Yamal', id, 'FW', true from public.teams where short_name = 'ESP'
union all select 'Nico Williams', id, 'FW', true from public.teams where short_name = 'ESP'
union all select 'Álvaro Morata', id, 'FW', true from public.teams where short_name = 'ESP'
union all select 'Cristiano Ronaldo', id, 'FW', true from public.teams where short_name = 'POR'
union all select 'Rafael Leão', id, 'FW', true from public.teams where short_name = 'POR'
union all select 'Bruno Fernandes', id, 'MF', true from public.teams where short_name = 'POR'
union all select 'Bernardo Silva', id, 'MF', true from public.teams where short_name = 'POR'
union all select 'Christian Pulisic', id, 'FW', true from public.teams where short_name = 'USA'
union all select 'Son Heung-min', id, 'FW', true from public.teams where short_name = 'KOR'
union all select 'Darwin Núñez', id, 'FW', true from public.teams where short_name = 'URU'
union all select 'Luis Díaz', id, 'FW', true from public.teams where short_name = 'COL'
on conflict do nothing;

insert into public.matches (stage, group_letter, home_team_id, away_team_id)
select 'group', a.group_letter, a.id, b.id
from public.teams a
join public.teams b on b.group_letter = a.group_letter and b.manual_order > a.manual_order
where a.group_letter in ('A', 'B', 'C', 'D')
on conflict do nothing;

-- El usuario admin inicial debe crearse en Supabase Auth.
-- Opción recomendada: usa el script de README con ADMIN_EMAIL y ADMIN_PASSWORD.
-- Después ejecuta:
-- update public.profiles set role = 'admin' where email = 'admin@porra.local';
