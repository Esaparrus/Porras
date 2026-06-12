# Sincronizacion opcional de resultados y goleadores

La app puede traer resultados (y, segun proveedor, goleadores) **sin sustituir
el modo manual**. El flujo manual sigue siendo el respaldo: el sync solo cierra
partidos que todavia no esten cerrados y nunca pisa lo que el admin ya metio a
mano.

## Proveedores

Se elige con `RESULTS_PROVIDER` (o se autodetecta: si hay `FOOTBALL_DATA_TOKEN`,
se usa football-data).

| Proveedor | Coste Mundial 2026 | Resultados | Goleadores |
|-----------|--------------------|------------|------------|
| `football-data` (football-data.org) | Gratis | Si (con algo de retraso) | No — manuales |
| `api-football` (API-Football) | Plan de pago (Free no da 2026) | Si | Si, automaticos |

### football-data.org (gratis, recomendado para 2026)

```env
RESULTS_PROVIDER=football-data
FOOTBALL_DATA_TOKEN=tu-token
FOOTBALL_DATA_BASE_URL=https://api.football-data.org/v4
FOOTBALL_DATA_COMPETITION=WC
```

Empareja los partidos por el codigo FIFA de 3 letras (`tla`), asi que no necesita
el script de mapeo. Los goleadores se siguen metiendo a mano (su plan gratis no
los incluye).

## Que hace y cuando

- Solo mira un partido cuando ya ha pasado un margen desde su hora de inicio:
  - Grupos: desde **150 min** despues del inicio (`API_FOOTBALL_GROUP_DELAY_MINUTES`).
  - Eliminatorias: desde **210 min** (`API_FOOTBALL_KNOCKOUT_DELAY_MINUTES`).
- Solo consulta la API cuando hay partidos candidatos, agrupando por fecha, para
  no gastar llamadas.
- Si la API no marca el partido como finalizado, no toca nada.
- El `update` lleva un filtro `is_finished = false`: si ya cerraste el partido a
  mano, el sync **nunca** lo sobreescribe.
- Ventana activa por partido (`API_FOOTBALL_LOOKBACK_MINUTES`, 12 h por defecto):
  solo se consulta la API mientras el partido esta dentro de esa ventana, para
  no malgastar peticiones reintentando durante dias. Fuera de ella queda el
  modo manual.

### Goleadores (modo propuesta)

Cuando un partido se cierra, el sync baja los eventos de gol y los deja como
**sugerencias pendientes** en `match_scorer_suggestions`. No escribe goles solo:
el admin las confirma o descarta desde `/admin/results`. Cuando puede, asigna
automaticamente el jugador local (por `api_football_player_id` o por nombre);
si no, el admin lo elige. Los autogoles se marcan y no puntuan a ningun goleador.

## Variables de entorno

```env
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_KEY=
CRON_SECRET=
# Opcionales para afinar los margenes:
# API_FOOTBALL_GROUP_DELAY_MINUTES=150
# API_FOOTBALL_KNOCKOUT_DELAY_MINUTES=210
# API_FOOTBALL_LOOKBACK_MINUTES=720
```

## Migracion

Antes de usarlo, aplica las migraciones (idempotentes):

```bash
npm run apply-schema-migration
```

Esto crea las columnas `api_football_*`, la tabla de sugerencias de goleadores
(`match_scorer_suggestions`) y el historial de ejecuciones
(`api_football_sync_logs`).

## Disparar el sync

### Manual (panel admin)

En `/admin/results` hay un boton **"Sincronizar ahora"** y se ve la ultima
ejecucion. Util para probar o forzar sin esperar al cron.

### Manual (curl)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tu-app/api/cron/sync-results
```

### Automatico (GitHub Action, gratis)

`.github/workflows/sync-results.yml` llama al endpoint cada 30 min. Configura dos
secrets de repositorio (Settings -> Secrets and variables -> Actions):

- `SYNC_URL`: la URL completa, p.ej. `https://tu-app.vercel.app/api/cron/sync-results`.
- `CRON_SECRET`: el mismo valor que en las variables de entorno de la app.

> Los crons de Vercel en plan gratis solo permiten una ejecucion al dia, por eso
> se usa GitHub Actions, que permite la cadencia de 30 min sin coste.

## Emparejado fiable

Para que el emparejado de partidos y jugadores sea solido, conviene guardar
`api_football_fixture_id` (partidos), `api_football_team_id` (equipos) y
`api_football_player_id` (jugadores) cuando se cargue el calendario real. Si no
existen, el sync intenta emparejar por nombre normalizado, pero **no inventa**
resultados ni goleadores si no encuentra una equivalencia clara.
