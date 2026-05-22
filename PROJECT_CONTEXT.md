# Contexto técnico del proyecto: Porra Mundial 2026

Este documento sirve para que otro chat, desarrollador o agente pueda entender rápidamente cómo funciona la app por dentro, qué está implementado y qué falta para dejarla lista con datos reales del Mundial 2026.

## Objetivo del proyecto

La aplicación gestiona una porra privada del Mundial 2026 sin usar ninguna API externa de fútbol.

Todo se administra manualmente:

- El admin crea ligas privadas.
- Cada liga genera un código.
- Los usuarios se registran con email, contraseña, apodo y código de liga.
- Los usuarios hacen apuestas.
- El admin introduce resultados reales, goleadores y premios finales.
- La app recalcula puntos y ranking.

La prioridad es que el flujo completo funcione antes que tener todos los datos reales perfectos desde el inicio.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Server Actions de Next.js
- Deploy preparado para Vercel

## Archivos clave

- `README.md`: guía de instalación, Supabase, admin, seed y deploy.
- `PROJECT_CONTEXT.md`: este documento de contexto interno.
- `supabase/schema.sql`: esquema completo de base de datos y políticas RLS.
- `supabase/seed.sql`: seed inicial de equipos, jugadores y partidos de ejemplo.
- `scripts/create-admin.mjs`: crea el usuario admin inicial.
- `src/app/actions.ts`: Server Actions principales.
- `src/lib/scoring.ts`: funciones puras de cálculo de puntos.
- `src/lib/types.ts`: tipos principales.
- `src/lib/constants.ts`: puntuaciones por defecto y etiquetas.
- `src/lib/supabase/server.ts`: cliente Supabase para sesión de usuario.
- `src/lib/supabase/admin.ts`: cliente Supabase con service role para acciones admin.
- `src/components/ui.tsx`: componentes reutilizables.
- `src/components/layouts.tsx`: layouts públicos, usuario y admin.

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=admin@porra.local
ADMIN_PASSWORD=1234
```

En desarrollo:

- Admin por defecto: `admin@porra.local`
- Password por defecto: `1234`

Para crear el admin:

```bash
npm run create-admin
```

## Flujo general

1. Admin entra en `/admin`.
2. Admin crea liga en `/admin/leagues/new`.
3. Se genera código tipo `HARAZURI-2026`.
4. Usuarios se registran en `/register` con código.
5. Si el código existe, se crea usuario y se añade a `league_members`.
6. Usuario entra en `/league/[leagueId]`.
7. Usuario apuesta en `/league/[leagueId]/predictions`.
8. Admin bloquea apuestas desde `/admin/leagues/[leagueId]/settings`.
9. Admin introduce resultados en `/admin/leagues/[leagueId]/matches` o `/daily`.
10. Admin suma goles desde `/admin/leagues/[leagueId]/scorers` o `/daily`.
11. Se recalcula `scores`.
12. Ranking visible en `/league/[leagueId]/ranking`.
13. Apuestas de otros visibles si la liga está bloqueada o `predictions_visible = true`.

## Rutas implementadas

Públicas:

- `/`
- `/login`
- `/register`

Usuario:

- `/dashboard`
- `/league/[leagueId]`
- `/league/[leagueId]/predictions`
- `/league/[leagueId]/ranking`
- `/league/[leagueId]/players`
- `/league/[leagueId]/players/[userId]`

Admin:

- `/admin`
- `/admin/leagues`
- `/admin/leagues/new`
- `/admin/leagues/[leagueId]`
- `/admin/leagues/[leagueId]/users`
- `/admin/leagues/[leagueId]/matches`
- `/admin/leagues/[leagueId]/scorers`
- `/admin/leagues/[leagueId]/awards`
- `/admin/leagues/[leagueId]/settings`
- `/admin/leagues/[leagueId]/daily`
- `/admin/leagues/[leagueId]/ranking`
- `/admin/leagues/[leagueId]/logs`
- `/admin/leagues/[leagueId]/predictions`

## Modelo de datos

### `profiles`

Perfil de usuario vinculado a `auth.users`.

Campos importantes:

- `id`
- `email`
- `display_name`
- `role`: `admin` o `player`

### `leagues`

Ligas privadas.

Campos importantes:

- `name`
- `code`
- `status`: `open`, `locked`, `in_progress`, `finished`
- `predictions_visible`
- `lock_matches`
- `lock_scorers`
- `lock_awards`
- `lock_knockouts`

### `league_members`

Relación usuario-liga.

Permite que un usuario pertenezca a una o varias ligas.

### `teams`

Selecciones.

Campos importantes:

- `name`
- `short_name`
- `flag_emoji`
- `group_letter`
- `fifa_ranking`
- `fair_play_points`
- `manual_order`

Nota: `fair_play_points` y `manual_order` ayudan a resolver desempates manualmente.

### `players`

Jugadores disponibles para goleadores y premios.

Campos importantes:

- `name`
- `team_id`
- `position`
- `is_star`
- `is_active`

Solo el admin debe añadir jugadores nuevos.

### `matches`

Partidos reales del Mundial.

Campos importantes:

- `stage`: `group`, `round_32`, `round_16`, `quarter_final`, `semi_final`, `final`
- `group_letter`
- `home_team_id`
- `away_team_id`
- `match_date`
- `home_score`
- `away_score`
- `is_finished`
- `is_locked`

Importante: para tener el Mundial real hay que cargar aquí todos los partidos.

### `match_predictions`

Apuestas de resultado exacto de los usuarios.

Campos importantes:

- `league_id`
- `user_id`
- `match_id`
- `predicted_home_score`
- `predicted_away_score`
- `predicted_winner_team_id`
- `points`

`predicted_winner_team_id` sirve para eliminatorias en vivo.

### `knockout_predictions`

Apuestas previas de equipos que alcanzan rondas.

Campos importantes:

- `round`: `round_32`, `round_16`, `quarter_final`, `semi_final`, `final`, `champion`
- `team_id`

Nota: la tabla existe y las funciones base existen, pero la UI completa de cuadro inicial todavía debe ampliarse.

### `scorer_predictions`

Tres goleadores elegidos por usuario.

Campos importantes:

- `player_id`
- `is_captain`

Hay índice parcial para que solo exista un capitán por usuario y liga.

### `league_player_goals`

Marcador rápido de goles por liga.

Esta tabla se añadió para que el admin pueda sumar goles rápidamente solo a jugadores elegidos por usuarios de esa liga.

Campos:

- `league_id`
- `player_id`
- `goals`

La vista rápida `/admin/leagues/[leagueId]/scorers` usa esta tabla.

### `match_scorers`

Goleadores asociados a partidos concretos.

Existe para registrar:

- Partido
- Jugador
- Goles

La UI principal usa de momento `league_player_goals` para rapidez. Se puede ampliar para que cada gol venga también asociado a un partido real.

### `award_predictions`

Apuestas de premios finales del usuario:

- Pichichi
- Mejor jugador
- Mejor portero
- Mejor joven

### `final_awards`

Premios reales introducidos por el admin al final del torneo.

### `league_point_settings`

Puntuación configurable por liga.

Incluye:

- Partidos
- Grupos
- Cuadro inicial
- Eliminatorias en vivo
- Goleadores
- Premios

### `scores`

Ranking materializado.

Campos importantes:

- `total_points`
- `match_points`
- `group_points`
- `knockout_points`
- `scorer_points`
- `award_points`
- `exact_scores_count`
- `champion_hit`

### `admin_logs`

Acciones del admin:

- Crear liga
- Cambiar puntos
- Meter resultados
- Sumar goles
- Resetear apuestas
- Editar premios

## Seguridad y RLS

El schema activa RLS en todas las tablas principales.

Reglas base:

- El admin puede verlo y gestionarlo todo.
- Un jugador solo ve ligas en las que es miembro.
- Un jugador solo edita sus propias apuestas.
- Los resultados reales, goles reales, premios y puntuación solo los cambia el admin.
- Los logs solo los ve el admin.

Funciones helper SQL:

- `public.is_admin()`
- `public.is_league_member(target_league uuid)`

## Server Actions principales

Archivo: `src/app/actions.ts`

Acciones implementadas:

- `loginAction`
- `logoutAction`
- `registerAction`
- `createLeagueAction`
- `updateLeagueSettingsAction`
- `updateLeagueLocksAction`
- `saveMatchPredictionsAction`
- `saveScorerPredictionsAction`
- `saveAwardPredictionsAction`
- `updateMatchResultAction`
- `quickGoalAction`
- `saveFinalAwardsAction`
- `resetUserBlockAction`
- `recalculateLeagueScoresAction`
- `recalculateLeagueScores`

Importante:

- Las acciones admin usan `SUPABASE_SERVICE_ROLE_KEY`.
- Las acciones de usuario validan sesión con `requireUser()`.
- Las acciones de admin validan rol con `requireAdmin()`.

## Funciones de cálculo

Archivo: `src/lib/scoring.ts`

Funciones existentes:

- `calculateMatchPredictionPoints()`
- `calculateAllMatchPointsForUser()`
- `calculatePredictedGroupStandings()`
- `calculateRealGroupStandings()`
- `calculateGroupPredictionPoints()`
- `calculateBestThirdPlacedTeams()`
- `calculateKnockoutPredictionPoints()`
- `calculateLiveKnockoutMatchPoints()`
- `calculateScorerPoints()`
- `calculateAwardPoints()`
- `calculateTotalUserScore()`
- `withDefaultSettings()`

La función principal que recalcula toda una liga está en `src/app/actions.ts`:

- `recalculateLeagueScores(leagueId)`

Actualmente recalcula:

- Puntos por partidos de grupo.
- Puntos por clasificación de grupos.
- Puntos por eliminatorias en vivo.
- Puntos por goleadores rápidos.
- Puntos por premios finales.
- Total.

## Puntuación por defecto

Partidos:

- Resultado exacto: 4
- Signo 1/X/2: 1

Grupos:

- Posición exacta: 2
- Ganador de grupo: 3
- Clasificado: 2
- Mejor tercero: 3

Cuadro inicial:

- Dieciseisavos: 2
- Octavos: 3
- Cuartos: 5
- Semifinales: 8
- Final: 12
- Campeón: 30

Eliminatorias en vivo:

- Dieciseisavos clasificado: 2
- Dieciseisavos exacto: 3
- Octavos clasificado: 3
- Octavos exacto: 3
- Cuartos clasificado: 4
- Cuartos exacto: 4
- Semis clasificado: 5
- Semis exacto: 4
- Final campeón: 8
- Final exacto: 5

Goleadores:

- Gol: 2
- Extra capitán: 1
- Máximo: 50

Premios:

- Pichichi: 25
- Mejor jugador: 18
- Mejor portero: 12
- Mejor joven: 10

## Cómo se calculan los grupos

El usuario no ordena grupos manualmente.

La app usa los resultados apostados en partidos de fase de grupos y calcula:

- Puntos
- Victorias
- Empates
- Derrotas
- Goles a favor
- Goles en contra
- Diferencia de goles

Función:

```ts
calculatePredictedGroupStandings(teams, matches, predictions, groupLetter)
```

Los resultados reales se calculan con:

```ts
calculateRealGroupStandings(teams, matches, groupLetter)
```

Desempates básicos:

1. Puntos
2. Diferencia de goles
3. Goles a favor
4. Ranking FIFA
5. Orden manual
6. Nombre

Pendiente a mejorar:

- Head-to-head avanzado entre equipos empatados.
- Fair play manual visible en UI admin.
- Sección específica “Resolver empates”.

## Mejores terceros

Función:

```ts
calculateBestThirdPlacedTeams(groups)
```

Toma el tercer clasificado de cada grupo y ordena por:

1. Puntos
2. Diferencia de goles
3. Goles a favor
4. Ranking FIFA
5. Orden manual
6. Nombre

Para Mundial 2026 real deben existir 12 grupos de 4 equipos. La función corta los 8 mejores terceros.

## Estado actual del seed

Archivo: `supabase/seed.sql`

Incluye:

- 16 selecciones de ejemplo.
- 4 grupos de ejemplo: A, B, C y D.
- Partidos de grupo generados para esos grupos.
- Jugadores estrella iniciales.

No incluye aún:

- Los 48 equipos reales completos del Mundial 2026.
- Los 12 grupos reales.
- Los 104 partidos reales.
- Fechas reales.
- Cruces reales de eliminatorias.
- Plantillas completas.

Esto es intencional para que el primer commit sea funcional. Hay que ampliar el seed cuando se quieran datos reales.

## Qué hay que hacer para cargar datos reales

### 1. Cargar los 48 equipos reales

Actualizar `supabase/seed.sql` o crear otro archivo, por ejemplo:

```text
supabase/seed-world-cup-2026-real.sql
```

Debe insertar en `teams`:

- `name`
- `short_name`
- `flag_emoji`
- `group_letter`
- `fifa_ranking`
- `manual_order`

Ejemplo:

```sql
insert into public.teams
(name, short_name, flag_emoji, group_letter, fifa_ranking, manual_order)
values
('España', 'ESP', '🇪🇸', 'A', 8, 1);
```

### 2. Cargar los 12 grupos reales

El Mundial 2026 tendrá:

- 12 grupos.
- 4 equipos por grupo.
- Pasan los 2 primeros de cada grupo.
- Pasan los 8 mejores terceros.

Los grupos deben usar letras:

- A
- B
- C
- D
- E
- F
- G
- H
- I
- J
- K
- L

### 3. Cargar partidos de fase de grupos

Cada grupo de 4 equipos tiene 6 partidos.

Total fase de grupos:

- 12 grupos x 6 partidos = 72 partidos.

Cada partido debe insertarse en `matches`:

```sql
insert into public.matches
(stage, group_letter, home_team_id, away_team_id, match_date)
values
('group', 'A', '<uuid-local>', '<uuid-visitante>', '2026-06-11 21:00:00+00');
```

Recomendación: usar `select id from teams where short_name = 'ESP'` para evitar UUIDs hardcodeados.

### 4. Cargar eliminatorias

El Mundial 2026 tendrá:

- Dieciseisavos
- Octavos
- Cuartos
- Semifinales
- Final

Los partidos de eliminatorias pueden crearse inicialmente con equipos placeholder o dejarse sin crear hasta que se sepan los cruces.

Opción práctica:

- Crear solo partidos de grupos antes del torneo.
- Cuando se sepan cruces reales, el admin o un seed añade partidos con `stage = 'round_32'`, etc.

### 5. Cargar jugadores reales

La tabla `players` puede empezar con estrellas y ampliarse manualmente.

Para que el admin pueda registrar goleadores reales, el jugador debe existir en `players`.

Ejemplo:

```sql
insert into public.players
(name, team_id, position, is_star)
select 'Kylian Mbappé', id, 'FW', true
from public.teams
where short_name = 'FRA';
```

### 6. Goleadores por partido vs goles rápidos

Hay dos formas:

1. `league_player_goals`: contador rápido por liga.
2. `match_scorers`: goles asociados a partidos reales.

La UI implementada prioriza `league_player_goals` porque el admin solo ve jugadores elegidos por usuarios.

Para hacerlo más realista después:

- Crear UI para añadir goleadores por partido.
- Cada vez que se inserte o actualice `match_scorers`, recalcular/actualizar `league_player_goals`.
- O calcular goles directamente desde `match_scorers`.

## Pendientes importantes

Funciona el flujo principal, pero quedan mejoras naturales:

- Cargar los 48 equipos reales.
- Cargar los 72 partidos reales de grupos.
- Preparar inserción de eliminatorias reales cuando se conozcan.
- Añadir UI admin para crear jugadores manualmente.
- Añadir UI admin para crear partidos manualmente.
- Añadir UI específica de “Resolver empates”.
- Completar UI de `knockout_predictions` previa al Mundial.
- Mejorar autocomplete real de jugadores. Ahora usa `select`, funcional pero no búsqueda dinámica.
- Añadir guardado de valores existentes en inputs de predicciones de partido.
- Añadir confirmación visual tipo toast después de guardar.
- Añadir confirmación modal real antes de resets.
- Vincular `match_scorers` con la vista rápida de goles.
- Añadir importador CSV para equipos, partidos y jugadores.

## Recomendación para el siguiente chat

Si se abre otro chat, darle este contexto y pedir algo concreto como:

```text
Lee PROJECT_CONTEXT.md y continúa desde ahí.
Quiero que implementes un importador CSV para cargar los 48 equipos, los 72 partidos de grupos y jugadores reales en Supabase.
```

O:

```text
Lee PROJECT_CONTEXT.md y mejora la parte de partidos reales:
- UI admin para crear/editar partidos.
- UI para añadir goleadores por partido.
- Sincronizar match_scorers con league_player_goals.
```

## Comandos verificados

Estos comandos pasan actualmente:

```bash
npm run lint
npm run build
```

El servidor dev se probó en:

```text
http://localhost:3001
```

El puerto 3000 estaba ocupado en ese momento.

