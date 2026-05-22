-- Mundial 2026 actualizado a 2026-05-19.
-- Fuentes base:
-- - FIFA: grupos/equipos clasificados y calendario oficial de 104 partidos.
-- - PDF oficial FIFA v17 2026-04-10: emparejamientos y horas en ET.
-- - Mercados Golden Boot 2026: candidatos iniciales a goleador para la porra.

insert into public.teams
  (name, short_name, flag_emoji, group_letter, fifa_ranking, manual_order)
values
  ('México', 'MEX', '🇲🇽', 'A', 16, 1),
  ('Sudáfrica', 'RSA', '🇿🇦', 'A', 60, 2),
  ('Corea del Sur', 'KOR', '🇰🇷', 'A', 22, 3),
  ('Chequia', 'CZE', '🇨🇿', 'A', 42, 4),
  ('Canadá', 'CAN', '🇨🇦', 'B', 29, 1),
  ('Suiza', 'SUI', '🇨🇭', 'B', 18, 2),
  ('Qatar', 'QAT', '🇶🇦', 'B', 51, 3),
  ('Bosnia y Herzegovina', 'BIH', '🇧🇦', 'B', 57, 4),
  ('Brasil', 'BRA', '🇧🇷', 'C', 5, 1),
  ('Marruecos', 'MAR', '🇲🇦', 'C', 8, 2),
  ('Haití', 'HAI', '🇭🇹', 'C', 84, 3),
  ('Escocia', 'SCO', '🏴', 'C', 36, 4),
  ('Estados Unidos', 'USA', '🇺🇸', 'D', 15, 1),
  ('Paraguay', 'PAR', '🇵🇾', 'D', 39, 2),
  ('Australia', 'AUS', '🇦🇺', 'D', 27, 3),
  ('Turquía', 'TUR', '🇹🇷', 'D', 34, 4),
  ('Alemania', 'GER', '🇩🇪', 'E', 10, 1),
  ('Curaçao', 'CUW', '🇨🇼', 'E', 82, 2),
  ('Costa de Marfil', 'CIV', '🇨🇮', 'E', 37, 3),
  ('Ecuador', 'ECU', '🇪🇨', 'E', 23, 4),
  ('Países Bajos', 'NED', '🇳🇱', 'F', 7, 1),
  ('Japón', 'JPN', '🇯🇵', 'F', 19, 2),
  ('Túnez', 'TUN', '🇹🇳', 'F', 47, 3),
  ('Suecia', 'SWE', '🇸🇪', 'F', 25, 4),
  ('Bélgica', 'BEL', '🇧🇪', 'G', 9, 1),
  ('Egipto', 'EGY', '🇪🇬', 'G', 31, 2),
  ('Irán', 'IRN', '🇮🇷', 'G', 20, 3),
  ('Nueva Zelanda', 'NZL', '🇳🇿', 'G', 86, 4),
  ('España', 'ESP', '🇪🇸', 'H', 2, 1),
  ('Cabo Verde', 'CPV', '🇨🇻', 'H', 68, 2),
  ('Arabia Saudí', 'KSA', '🇸🇦', 'H', 60, 3),
  ('Uruguay', 'URU', '🇺🇾', 'H', 17, 4),
  ('Francia', 'FRA', '🇫🇷', 'I', 1, 1),
  ('Senegal', 'SEN', '🇸🇳', 'I', 12, 2),
  ('Noruega', 'NOR', '🇳🇴', 'I', 32, 3),
  ('Irak', 'IRQ', '🇮🇶', 'I', 63, 4),
  ('Argentina', 'ARG', '🇦🇷', 'J', 3, 1),
  ('Argelia', 'ALG', '🇩🇿', 'J', 28, 2),
  ('Austria', 'AUT', '🇦🇹', 'J', 24, 3),
  ('Jordania', 'JOR', '🇯🇴', 'J', 64, 4),
  ('Portugal', 'POR', '🇵🇹', 'K', 5, 1),
  ('Uzbekistán', 'UZB', '🇺🇿', 'K', 52, 2),
  ('Colombia', 'COL', '🇨🇴', 'K', 14, 3),
  ('RD Congo', 'COD', '🇨🇩', 'K', 50, 4),
  ('Inglaterra', 'ENG', '🏴', 'L', 4, 1),
  ('Croacia', 'CRO', '🇭🇷', 'L', 11, 2),
  ('Ghana', 'GHA', '🇬🇭', 'L', 72, 3),
  ('Panamá', 'PAN', '🇵🇦', 'L', 33, 4)
on conflict (short_name) do update set
  name = excluded.name,
  flag_emoji = excluded.flag_emoji,
  group_letter = excluded.group_letter,
  fifa_ranking = excluded.fifa_ranking,
  manual_order = excluded.manual_order;

update public.teams
set flag_code = case short_name
  when 'MEX' then 'mx' when 'RSA' then 'za' when 'KOR' then 'kr' when 'CZE' then 'cz'
  when 'CAN' then 'ca' when 'SUI' then 'ch' when 'QAT' then 'qa' when 'BIH' then 'ba'
  when 'BRA' then 'br' when 'MAR' then 'ma' when 'HAI' then 'ht' when 'SCO' then 'gb-sct'
  when 'USA' then 'us' when 'PAR' then 'py' when 'AUS' then 'au' when 'TUR' then 'tr'
  when 'GER' then 'de' when 'CUW' then 'cw' when 'CIV' then 'ci' when 'ECU' then 'ec'
  when 'NED' then 'nl' when 'JPN' then 'jp' when 'TUN' then 'tn' when 'SWE' then 'se'
  when 'BEL' then 'be' when 'EGY' then 'eg' when 'IRN' then 'ir' when 'NZL' then 'nz'
  when 'ESP' then 'es' when 'CPV' then 'cv' when 'KSA' then 'sa' when 'URU' then 'uy'
  when 'FRA' then 'fr' when 'SEN' then 'sn' when 'NOR' then 'no' when 'IRQ' then 'iq'
  when 'ARG' then 'ar' when 'ALG' then 'dz' when 'AUT' then 'at' when 'JOR' then 'jo'
  when 'POR' then 'pt' when 'UZB' then 'uz' when 'COL' then 'co' when 'COD' then 'cd'
  when 'ENG' then 'gb-eng' when 'CRO' then 'hr' when 'GHA' then 'gh' when 'PAN' then 'pa'
  else flag_code
end;

with player_rows(name, short_name, position, is_star, scorer_rank) as (
  values
    ('Kylian Mbappé', 'FRA', 'FW', true, 1),
    ('Harry Kane', 'ENG', 'FW', true, 2),
    ('Lionel Messi', 'ARG', 'FW', true, 3),
    ('Erling Haaland', 'NOR', 'FW', true, 4),
    ('Lamine Yamal', 'ESP', 'FW', true, 5),
    ('Mikel Oyarzabal', 'ESP', 'FW', true, 6),
    ('Vinícius Jr', 'BRA', 'FW', true, 7),
    ('Ousmane Dembélé', 'FRA', 'FW', true, 8),
    ('Raphinha', 'BRA', 'FW', true, 9),
    ('Cristiano Ronaldo', 'POR', 'FW', true, 10),
    ('Lautaro Martínez', 'ARG', 'FW', true, 11),
    ('Luis Díaz', 'COL', 'FW', true, 12),
    ('João Pedro', 'BRA', 'FW', true, 13),
    ('Richarlison', 'BRA', 'FW', true, 14),
    ('Ferran Torres', 'ESP', 'FW', true, 15),
    ('Estêvão', 'BRA', 'FW', true, 16),
    ('Bruno Fernandes', 'POR', 'MF', true, 17),
    ('Viktor Gyökeres', 'SWE', 'FW', true, 18),
    ('Alexander Isak', 'SWE', 'FW', true, 19),
    ('Romelu Lukaku', 'BEL', 'FW', true, 20),
    ('Julián Álvarez', 'ARG', 'FW', true, 21),
    ('Bukayo Saka', 'ENG', 'FW', true, 22),
    ('Michael Olise', 'FRA', 'FW', true, 23),
    ('Neymar', 'BRA', 'FW', true, 24),
    ('Cody Gakpo', 'NED', 'FW', true, 25),
    ('Darwin Núñez', 'URU', 'FW', true, 26),
    ('Kai Havertz', 'GER', 'FW', true, 27),
    ('Jude Bellingham', 'ENG', 'MF', true, 28),
    ('Cole Palmer', 'ENG', 'FW', true, 29),
    ('Marcus Rashford', 'ENG', 'FW', true, 30),
    ('Antoine Griezmann', 'FRA', 'FW', true, 31),
    ('Jamal Musiala', 'GER', 'MF', true, 32),
    ('Florian Wirtz', 'GER', 'MF', true, 33),
    ('Memphis Depay', 'NED', 'FW', true, 34),
    ('Mohamed Salah', 'EGY', 'FW', true, 35),
    ('Sadio Mané', 'SEN', 'FW', true, 36),
    ('Christian Pulisic', 'USA', 'FW', true, 37),
    ('Son Heung-min', 'KOR', 'FW', true, 38),
    ('Kaoru Mitoma', 'JPN', 'FW', true, 39),
    ('Takefusa Kubo', 'JPN', 'FW', true, 40),
    ('Salem Al-Dawsari', 'KSA', 'FW', true, 41),
    ('Enner Valencia', 'ECU', 'FW', true, 42),
    ('Youssef En-Nesyri', 'MAR', 'FW', true, 43),
    ('Mehdi Taremi', 'IRN', 'FW', true, 44),
    ('Álvaro Morata', 'ESP', 'FW', true, 45),
    ('Rodrygo', 'BRA', 'FW', true, 46),
    ('Rafael Leão', 'POR', 'FW', true, 47),
    ('Bernardo Silva', 'POR', 'MF', true, 48),
    ('Folarin Balogun', 'USA', 'FW', true, 49),
    ('Jonathan David', 'CAN', 'FW', true, 50),
    ('Santiago Giménez', 'MEX', 'FW', true, 51),
    ('Hirving Lozano', 'MEX', 'FW', false, 52),
    ('Gonçalo Ramos', 'POR', 'FW', false, 53),
    ('Ángel Di María', 'ARG', 'FW', false, 54),
    ('Dejan Kulusevski', 'SWE', 'FW', false, 55)
)
insert into public.players (name, team_id, position, is_star, scorer_rank)
select player_rows.name, teams.id, player_rows.position, player_rows.is_star, player_rows.scorer_rank
from player_rows
join public.teams on teams.short_name = player_rows.short_name
on conflict (team_id, name) do update set
  position = excluded.position,
  is_star = excluded.is_star,
  scorer_rank = excluded.scorer_rank,
  is_active = true;

update public.players
set is_active = true;

delete from public.matches
where match_number is null;

with match_rows(match_number, stage, group_letter, home_short, away_short, match_date, venue, home_placeholder, away_placeholder) as (
  values
    (1, 'group', 'A', 'MEX', 'RSA', '2026-06-11 15:00:00-04'::timestamptz, 'Mexico City Stadium', null, null),
    (2, 'group', 'A', 'KOR', 'CZE', '2026-06-11 22:00:00-04'::timestamptz, 'Estadio Guadalajara', null, null),
    (3, 'group', 'B', 'CAN', 'BIH', '2026-06-12 15:00:00-04'::timestamptz, 'Toronto Stadium', null, null),
    (4, 'group', 'D', 'USA', 'PAR', '2026-06-12 21:00:00-04'::timestamptz, 'Los Angeles Stadium', null, null),
    (5, 'group', 'C', 'HAI', 'SCO', '2026-06-13 21:00:00-04'::timestamptz, 'Boston Stadium', null, null),
    (6, 'group', 'D', 'AUS', 'TUR', '2026-06-13 00:00:00-04'::timestamptz, 'BC Place Vancouver', null, null),
    (7, 'group', 'C', 'BRA', 'MAR', '2026-06-13 18:00:00-04'::timestamptz, 'New York New Jersey Stadium', null, null),
    (8, 'group', 'B', 'QAT', 'SUI', '2026-06-13 15:00:00-04'::timestamptz, 'San Francisco Bay Area Stadium', null, null),
    (9, 'group', 'E', 'CIV', 'ECU', '2026-06-14 19:00:00-04'::timestamptz, 'Philadelphia Stadium', null, null),
    (10, 'group', 'E', 'GER', 'CUW', '2026-06-14 13:00:00-04'::timestamptz, 'Houston Stadium', null, null),
    (11, 'group', 'F', 'NED', 'JPN', '2026-06-14 16:00:00-04'::timestamptz, 'Dallas Stadium', null, null),
    (12, 'group', 'F', 'SWE', 'TUN', '2026-06-14 22:00:00-04'::timestamptz, 'Estadio Monterrey', null, null),
    (13, 'group', 'H', 'KSA', 'URU', '2026-06-15 18:00:00-04'::timestamptz, 'Miami Stadium', null, null),
    (14, 'group', 'H', 'ESP', 'CPV', '2026-06-15 12:00:00-04'::timestamptz, 'Atlanta Stadium', null, null),
    (15, 'group', 'G', 'IRN', 'NZL', '2026-06-15 21:00:00-04'::timestamptz, 'Los Angeles Stadium', null, null),
    (16, 'group', 'G', 'BEL', 'EGY', '2026-06-15 15:00:00-04'::timestamptz, 'Seattle Stadium', null, null),
    (17, 'group', 'I', 'FRA', 'SEN', '2026-06-16 15:00:00-04'::timestamptz, 'New York New Jersey Stadium', null, null),
    (18, 'group', 'I', 'NOR', 'IRQ', '2026-06-16 18:00:00-04'::timestamptz, 'Boston Stadium', null, null),
    (19, 'group', 'J', 'ARG', 'ALG', '2026-06-16 21:00:00-04'::timestamptz, 'Kansas City Stadium', null, null),
    (20, 'group', 'J', 'AUT', 'JOR', '2026-06-16 00:00:00-04'::timestamptz, 'San Francisco Bay Area Stadium', null, null),
    (21, 'group', 'L', 'GHA', 'PAN', '2026-06-17 19:00:00-04'::timestamptz, 'Toronto Stadium', null, null),
    (22, 'group', 'L', 'ENG', 'CRO', '2026-06-17 16:00:00-04'::timestamptz, 'Dallas Stadium', null, null),
    (23, 'group', 'K', 'POR', 'COD', '2026-06-17 13:00:00-04'::timestamptz, 'Houston Stadium', null, null),
    (24, 'group', 'K', 'UZB', 'COL', '2026-06-17 22:00:00-04'::timestamptz, 'Mexico City Stadium', null, null),
    (25, 'group', 'A', 'CZE', 'RSA', '2026-06-18 12:00:00-04'::timestamptz, 'Atlanta Stadium', null, null),
    (26, 'group', 'B', 'SUI', 'BIH', '2026-06-18 15:00:00-04'::timestamptz, 'Los Angeles Stadium', null, null),
    (27, 'group', 'B', 'CAN', 'QAT', '2026-06-18 18:00:00-04'::timestamptz, 'BC Place Vancouver', null, null),
    (28, 'group', 'A', 'MEX', 'KOR', '2026-06-18 21:00:00-04'::timestamptz, 'Estadio Guadalajara', null, null),
    (29, 'group', 'C', 'BRA', 'HAI', '2026-06-19 20:30:00-04'::timestamptz, 'Philadelphia Stadium', null, null),
    (30, 'group', 'C', 'SCO', 'MAR', '2026-06-19 18:00:00-04'::timestamptz, 'Boston Stadium', null, null),
    (31, 'group', 'D', 'TUR', 'PAR', '2026-06-19 23:00:00-04'::timestamptz, 'San Francisco Bay Area Stadium', null, null),
    (32, 'group', 'D', 'USA', 'AUS', '2026-06-19 15:00:00-04'::timestamptz, 'Seattle Stadium', null, null),
    (33, 'group', 'E', 'GER', 'CIV', '2026-06-20 16:00:00-04'::timestamptz, 'Toronto Stadium', null, null),
    (34, 'group', 'E', 'ECU', 'CUW', '2026-06-20 20:00:00-04'::timestamptz, 'Kansas City Stadium', null, null),
    (35, 'group', 'F', 'NED', 'SWE', '2026-06-20 13:00:00-04'::timestamptz, 'Houston Stadium', null, null),
    (36, 'group', 'F', 'TUN', 'JPN', '2026-06-20 00:00:00-04'::timestamptz, 'Estadio Monterrey', null, null),
    (37, 'group', 'H', 'URU', 'CPV', '2026-06-21 18:00:00-04'::timestamptz, 'Miami Stadium', null, null),
    (38, 'group', 'H', 'ESP', 'KSA', '2026-06-21 12:00:00-04'::timestamptz, 'Atlanta Stadium', null, null),
    (39, 'group', 'G', 'BEL', 'IRN', '2026-06-21 15:00:00-04'::timestamptz, 'Los Angeles Stadium', null, null),
    (40, 'group', 'G', 'NZL', 'EGY', '2026-06-21 21:00:00-04'::timestamptz, 'BC Place Vancouver', null, null),
    (41, 'group', 'I', 'NOR', 'SEN', '2026-06-22 20:00:00-04'::timestamptz, 'New York New Jersey Stadium', null, null),
    (42, 'group', 'I', 'FRA', 'IRQ', '2026-06-22 17:00:00-04'::timestamptz, 'Philadelphia Stadium', null, null),
    (43, 'group', 'J', 'ARG', 'AUT', '2026-06-22 13:00:00-04'::timestamptz, 'Dallas Stadium', null, null),
    (44, 'group', 'J', 'JOR', 'ALG', '2026-06-22 23:00:00-04'::timestamptz, 'San Francisco Bay Area Stadium', null, null),
    (45, 'group', 'L', 'ENG', 'GHA', '2026-06-23 16:00:00-04'::timestamptz, 'Boston Stadium', null, null),
    (46, 'group', 'L', 'PAN', 'CRO', '2026-06-23 19:00:00-04'::timestamptz, 'Toronto Stadium', null, null),
    (47, 'group', 'K', 'POR', 'UZB', '2026-06-23 13:00:00-04'::timestamptz, 'Houston Stadium', null, null),
    (48, 'group', 'K', 'COL', 'COD', '2026-06-23 22:00:00-04'::timestamptz, 'Estadio Guadalajara', null, null),
    (49, 'group', 'C', 'SCO', 'BRA', '2026-06-24 18:00:00-04'::timestamptz, 'Miami Stadium', null, null),
    (50, 'group', 'C', 'MAR', 'HAI', '2026-06-24 18:00:00-04'::timestamptz, 'Atlanta Stadium', null, null),
    (51, 'group', 'B', 'SUI', 'CAN', '2026-06-24 15:00:00-04'::timestamptz, 'BC Place Vancouver', null, null),
    (52, 'group', 'B', 'BIH', 'QAT', '2026-06-24 15:00:00-04'::timestamptz, 'Seattle Stadium', null, null),
    (53, 'group', 'A', 'CZE', 'MEX', '2026-06-24 21:00:00-04'::timestamptz, 'Mexico City Stadium', null, null),
    (54, 'group', 'A', 'RSA', 'KOR', '2026-06-24 21:00:00-04'::timestamptz, 'Estadio Monterrey', null, null),
    (55, 'group', 'E', 'CUW', 'CIV', '2026-06-25 16:00:00-04'::timestamptz, 'Philadelphia Stadium', null, null),
    (56, 'group', 'E', 'ECU', 'GER', '2026-06-25 16:00:00-04'::timestamptz, 'New York New Jersey Stadium', null, null),
    (57, 'group', 'F', 'JPN', 'SWE', '2026-06-25 19:00:00-04'::timestamptz, 'Dallas Stadium', null, null),
    (58, 'group', 'F', 'TUN', 'NED', '2026-06-25 19:00:00-04'::timestamptz, 'Kansas City Stadium', null, null),
    (59, 'group', 'D', 'TUR', 'USA', '2026-06-25 22:00:00-04'::timestamptz, 'Los Angeles Stadium', null, null),
    (60, 'group', 'D', 'PAR', 'AUS', '2026-06-25 22:00:00-04'::timestamptz, 'San Francisco Bay Area Stadium', null, null),
    (61, 'group', 'I', 'NOR', 'FRA', '2026-06-26 15:00:00-04'::timestamptz, 'Boston Stadium', null, null),
    (62, 'group', 'I', 'SEN', 'IRQ', '2026-06-26 15:00:00-04'::timestamptz, 'Toronto Stadium', null, null),
    (63, 'group', 'G', 'EGY', 'IRN', '2026-06-26 23:00:00-04'::timestamptz, 'Seattle Stadium', null, null),
    (64, 'group', 'G', 'NZL', 'BEL', '2026-06-26 23:00:00-04'::timestamptz, 'BC Place Vancouver', null, null),
    (65, 'group', 'H', 'CPV', 'KSA', '2026-06-26 20:00:00-04'::timestamptz, 'Houston Stadium', null, null),
    (66, 'group', 'H', 'URU', 'ESP', '2026-06-26 20:00:00-04'::timestamptz, 'Estadio Guadalajara', null, null),
    (67, 'group', 'L', 'PAN', 'ENG', '2026-06-27 17:00:00-04'::timestamptz, 'New York New Jersey Stadium', null, null),
    (68, 'group', 'L', 'CRO', 'GHA', '2026-06-27 17:00:00-04'::timestamptz, 'Philadelphia Stadium', null, null),
    (69, 'group', 'J', 'ALG', 'AUT', '2026-06-27 22:00:00-04'::timestamptz, 'Kansas City Stadium', null, null),
    (70, 'group', 'J', 'JOR', 'ARG', '2026-06-27 22:00:00-04'::timestamptz, 'Dallas Stadium', null, null),
    (71, 'group', 'K', 'COL', 'POR', '2026-06-27 19:30:00-04'::timestamptz, 'Miami Stadium', null, null),
    (72, 'group', 'K', 'UZB', 'COD', '2026-06-27 19:30:00-04'::timestamptz, 'Atlanta Stadium', null, null),
    (73, 'round_32', null, null, null, '2026-06-28 15:00:00-04'::timestamptz, 'Los Angeles Stadium', '2º Grupo A', '2º Grupo B'),
    (74, 'round_32', null, null, null, '2026-06-29 16:30:00-04'::timestamptz, 'Boston Stadium', '1º Grupo E', '3º Grupo A/B/C/D/F'),
    (75, 'round_32', null, null, null, '2026-06-29 21:00:00-04'::timestamptz, 'Estadio Monterrey', '1º Grupo F', '2º Grupo C'),
    (76, 'round_32', null, null, null, '2026-06-29 13:00:00-04'::timestamptz, 'Houston Stadium', '1º Grupo C', '2º Grupo F'),
    (77, 'round_32', null, null, null, '2026-06-30 17:00:00-04'::timestamptz, 'New York New Jersey Stadium', '1º Grupo I', '3º Grupo C/D/F/G/H'),
    (78, 'round_32', null, null, null, '2026-06-30 13:00:00-04'::timestamptz, 'Dallas Stadium', '2º Grupo E', '2º Grupo I'),
    (79, 'round_32', null, null, null, '2026-06-30 21:00:00-04'::timestamptz, 'Mexico City Stadium', '1º Grupo A', '3º Grupo C/E/F/H/I'),
    (80, 'round_32', null, null, null, '2026-07-01 12:00:00-04'::timestamptz, 'Atlanta Stadium', '1º Grupo L', '3º Grupo E/H/I/J/K'),
    (81, 'round_32', null, null, null, '2026-07-01 20:00:00-04'::timestamptz, 'San Francisco Bay Area Stadium', '1º Grupo D', '3º Grupo B/E/F/I/J'),
    (82, 'round_32', null, null, null, '2026-07-01 16:00:00-04'::timestamptz, 'Seattle Stadium', '1º Grupo G', '3º Grupo A/E/H/I/J'),
    (83, 'round_32', null, null, null, '2026-07-02 19:00:00-04'::timestamptz, 'Toronto Stadium', '2º Grupo K', '2º Grupo L'),
    (84, 'round_32', null, null, null, '2026-07-02 15:00:00-04'::timestamptz, 'Los Angeles Stadium', '1º Grupo H', '2º Grupo J'),
    (85, 'round_32', null, null, null, '2026-07-02 23:00:00-04'::timestamptz, 'BC Place Vancouver', '1º Grupo B', '3º Grupo E/F/G/I/J'),
    (86, 'round_32', null, null, null, '2026-07-03 18:00:00-04'::timestamptz, 'Miami Stadium', '1º Grupo J', '2º Grupo H'),
    (87, 'round_32', null, null, null, '2026-07-03 21:30:00-04'::timestamptz, 'Kansas City Stadium', '1º Grupo K', '3º Grupo D/E/I/J/L'),
    (88, 'round_32', null, null, null, '2026-07-03 14:00:00-04'::timestamptz, 'Dallas Stadium', '2º Grupo D', '2º Grupo G'),
    (89, 'round_16', null, null, null, '2026-07-04 17:00:00-04'::timestamptz, 'Philadelphia Stadium', 'Ganador partido 74', 'Ganador partido 77'),
    (90, 'round_16', null, null, null, '2026-07-04 13:00:00-04'::timestamptz, 'Houston Stadium', 'Ganador partido 73', 'Ganador partido 75'),
    (91, 'round_16', null, null, null, '2026-07-05 16:00:00-04'::timestamptz, 'New York New Jersey Stadium', 'Ganador partido 76', 'Ganador partido 78'),
    (92, 'round_16', null, null, null, '2026-07-05 20:00:00-04'::timestamptz, 'Mexico City Stadium', 'Ganador partido 79', 'Ganador partido 80'),
    (93, 'round_16', null, null, null, '2026-07-06 15:00:00-04'::timestamptz, 'Dallas Stadium', 'Ganador partido 83', 'Ganador partido 84'),
    (94, 'round_16', null, null, null, '2026-07-06 20:00:00-04'::timestamptz, 'Seattle Stadium', 'Ganador partido 81', 'Ganador partido 82'),
    (95, 'round_16', null, null, null, '2026-07-07 12:00:00-04'::timestamptz, 'Atlanta Stadium', 'Ganador partido 86', 'Ganador partido 88'),
    (96, 'round_16', null, null, null, '2026-07-07 16:00:00-04'::timestamptz, 'BC Place Vancouver', 'Ganador partido 85', 'Ganador partido 87'),
    (97, 'quarter_final', null, null, null, '2026-07-09 16:00:00-04'::timestamptz, 'Boston Stadium', 'Ganador partido 89', 'Ganador partido 90'),
    (98, 'quarter_final', null, null, null, '2026-07-10 15:00:00-04'::timestamptz, 'Los Angeles Stadium', 'Ganador partido 93', 'Ganador partido 94'),
    (99, 'quarter_final', null, null, null, '2026-07-11 17:00:00-04'::timestamptz, 'Miami Stadium', 'Ganador partido 91', 'Ganador partido 92'),
    (100, 'quarter_final', null, null, null, '2026-07-11 21:00:00-04'::timestamptz, 'Kansas City Stadium', 'Ganador partido 95', 'Ganador partido 96'),
    (101, 'semi_final', null, null, null, '2026-07-14 15:00:00-04'::timestamptz, 'Dallas Stadium', 'Ganador partido 97', 'Ganador partido 98'),
    (102, 'semi_final', null, null, null, '2026-07-15 15:00:00-04'::timestamptz, 'Atlanta Stadium', 'Ganador partido 99', 'Ganador partido 100'),
    (103, 'third_place', null, null, null, '2026-07-18 17:00:00-04'::timestamptz, 'Miami Stadium', 'Perdedor partido 101', 'Perdedor partido 102'),
    (104, 'final', null, null, null, '2026-07-19 15:00:00-04'::timestamptz, 'New York New Jersey Stadium', 'Ganador partido 101', 'Ganador partido 102')
)
insert into public.matches
  (match_number, stage, group_letter, home_team_id, away_team_id, match_date, venue, home_placeholder, away_placeholder)
select
  match_rows.match_number,
  match_rows.stage::public.match_stage,
  match_rows.group_letter,
  home_team.id,
  away_team.id,
  match_rows.match_date,
  match_rows.venue,
  match_rows.home_placeholder,
  match_rows.away_placeholder
from match_rows
left join public.teams home_team on home_team.short_name = match_rows.home_short
left join public.teams away_team on away_team.short_name = match_rows.away_short
on conflict (match_number) do update set
  stage = excluded.stage,
  group_letter = excluded.group_letter,
  home_team_id = coalesce(excluded.home_team_id, public.matches.home_team_id),
  away_team_id = coalesce(excluded.away_team_id, public.matches.away_team_id),
  match_date = excluded.match_date,
  venue = excluded.venue,
  home_placeholder = excluded.home_placeholder,
  away_placeholder = excluded.away_placeholder;

-- El usuario admin inicial debe crearse en Supabase Auth.
-- Opción recomendada: usa el script del README con ADMIN_EMAIL y ADMIN_PASSWORD.
-- Después ejecuta:
-- update public.profiles set role = 'admin' where email = 'admin@porra.local';

