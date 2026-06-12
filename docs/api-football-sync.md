# Sincronizacion opcional de resultados

La app puede traer resultados finales desde API-Football sin sustituir el modo
manual. Solo actualiza partidos que todavia no esten cerrados y cuya hora de
inicio ya haya pasado con margen:

- Grupos: desde 150 minutos despues del inicio.
- Eliminatorias: desde 210 minutos despues del inicio.
- Si la API no marca el partido como finalizado, no toca nada.

Variables necesarias:

```env
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_KEY=
CRON_SECRET=
```

Antes de usarlo, aplica la migracion:

```bash
npm run apply-schema-migration
```

Endpoint:

```text
GET /api/cron/sync-results
Authorization: Bearer CRON_SECRET
```

Tambien se puede probar localmente con:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-results
```

Para que el emparejado sea fiable, conviene guardar `api_football_fixture_id`
en cada partido cuando se cargue el calendario real. Si no existe, el sync
intentara emparejar por IDs de equipo de API-Football o por nombre, pero no
inventara resultados si no encuentra una equivalencia clara.
