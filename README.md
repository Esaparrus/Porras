# Porra Mundial 2026

Aplicación privada para gestionar porras del Mundial 2026 sin API externa de fútbol. Todo se administra manualmente desde el panel admin.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL y Row Level Security
- Deploy preparado para Vercel

## Instalar

```bash
npm install
cp .env.example .env.local
```

Rellena `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=admin@porra.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=1234
```

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Copia `Project URL`, `anon key` y `service_role key` en `.env.local`.
3. Abre el SQL editor de Supabase.
4. Ejecuta `supabase/schema.sql`.
5. Ejecuta `supabase/seed.sql`.

El seed incluye equipos, grupos de ejemplo, partidos de grupo y jugadores estrella. La estructura queda preparada para cargar los 104 partidos reales cuando quieras.

## Crear el admin

En local, por defecto:

- email: `admin@porra.local`
- usuario: `admin`
- password: `1234`

Para crearlo:

```bash
npm run create-admin
```

En producción configura:

```env
ADMIN_EMAIL=tu-admin@dominio.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=una-password-segura
```

Después ejecuta el mismo script con esas variables disponibles. En Vercel puedes ejecutarlo localmente contra la base de producción o crear el usuario desde Supabase Auth y marcar su perfil como `admin`.

## Ejecutar localmente

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Flujo de uso

1. Entra en `/admin` con el usuario admin.
2. Crea una liga, por ejemplo `Harazuri`.
3. Copia el código generado, por ejemplo `HARAZURI-2026`.
4. Pasa el código a tus amigos.
5. Cada usuario se registra con usuario, contraseña y código.
6. Los usuarios rellenan partidos, goleadores y premios.
7. La pestaña de grupos calcula la clasificación prevista según sus resultados.
8. El admin bloquea apuestas desde ajustes.
9. El admin actualiza resultados en `/admin/leagues/[leagueId]/daily` o en partidos.
10. El admin suma goles desde la vista rápida de goleadores.
11. La app recalcula el ranking automáticamente.
12. Al final, el admin mete premios finales y queda el ganador.

## Rutas principales

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

## Puntuación por defecto

Partidos:

- Resultado exacto: 4
- Signo 1/X/2: 1

Grupos:

- Posición exacta: 2
- Ganador de grupo: 3
- Clasificado: 2
- Mejor tercero: 3

Eliminatorias:

- Dieciseisavos: 2
- Octavos: 3
- Cuartos: 5
- Semifinales: 8
- Final: 12
- Campeón: 30

Goleadores:

- Gol: 2
- Extra capitán: 1
- Máximo apartado: 50

Premios:

- Pichichi: 25
- Mejor jugador: 18
- Mejor portero: 12
- Mejor joven: 10

Todo se puede cambiar por liga desde `/admin/leagues/[leagueId]/settings`. Al guardar se recalcula el ranking.

## Deploy en Vercel

1. Sube el proyecto a GitHub.
2. Importa el repo en Vercel.
3. Añade las variables de entorno.
4. Despliega.
5. Ejecuta el schema y seed en Supabase.
6. Crea el admin con `npm run create-admin` apuntando a producción.

## Notas de implementación

- No se usa ninguna API externa de fútbol.
- RLS limita lectura y escritura por liga y usuario.
- El admin usa `SUPABASE_SERVICE_ROLE_KEY` desde Server Actions para operaciones administrativas.
- Las funciones de cálculo viven en `src/lib/scoring.ts`.
- La vista diaria está pensada para actualizar resultados y goleadores rápido desde móvil.
