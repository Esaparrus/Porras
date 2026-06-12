// Mapeo unico de IDs de API-Football. Se ejecuta una vez (en el PC, con la clave
// y la BD disponibles) para guardar:
//   - teams.api_football_team_id  (necesario porque los nombres locales estan en
//     espanol y la API los da en ingles: sin esto el emparejado por nombre falla)
//   - players.api_football_player_id  para los jugadores que alguien ha apostado
//
// Asi cada partido y cada gol se reconocen por ID estable desde el primer dia.
// Es idempotente: salta lo que ya tenga ID. Imprime un informe con lo que no
// pudo resolver para que se ajuste a mano (son pocos).
//
//   npm run map-api-football
//   npm run map-api-football -- --dry      (solo informe, sin escribir)

import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DRY_RUN = process.argv.includes("--dry");

const apiKey = process.env.API_FOOTBALL_KEY ?? process.env.FOOTBALL_API_KEY;
const baseUrl =
  process.env.API_FOOTBALL_BASE_URL ??
  process.env.FOOTBALL_API_BASE_URL ??
  "https://v3.football.api-sports.io";
const leagueId = process.env.API_FOOTBALL_LEAGUE_ID ?? "1";
const season = process.env.API_FOOTBALL_SEASON ?? "2026";

if (!apiKey) throw new Error("Falta API_FOOTBALL_KEY (o FOOTBALL_API_KEY) en .env.local");
if (!process.env.POSTGRES_URL_NON_POOLING)
  throw new Error("Falta POSTGRES_URL_NON_POOLING en .env.local");

// FIFA short_name -> nombre en ingles tal como suele usarlo API-Football.
// Se usa junto a coincidencia por "contiene" y por codigo, asi que no hace
// falta que sea exacto al 100%.
const ENGLISH_NAME = {
  MEX: "Mexico", RSA: "South Africa", KOR: "South Korea", CZE: "Czech Republic",
  CAN: "Canada", SUI: "Switzerland", QAT: "Qatar", BIH: "Bosnia and Herzegovina",
  BRA: "Brazil", MAR: "Morocco", HAI: "Haiti", SCO: "Scotland", USA: "USA",
  PAR: "Paraguay", AUS: "Australia", TUR: "Turkey", GER: "Germany", CUW: "Curacao",
  CIV: "Ivory Coast", ECU: "Ecuador", NED: "Netherlands", JPN: "Japan", TUN: "Tunisia",
  SWE: "Sweden", BEL: "Belgium", EGY: "Egypt", IRN: "Iran", NZL: "New Zealand",
  ESP: "Spain", CPV: "Cape Verde", KSA: "Saudi Arabia", URU: "Uruguay", FRA: "France",
  SEN: "Senegal", NOR: "Norway", IRQ: "Iraq", ARG: "Argentina", ALG: "Algeria",
  AUT: "Austria", JOR: "Jordan", POR: "Portugal", UZB: "Uzbekistan", COL: "Colombia",
  COD: "DR Congo", ENG: "England", CRO: "Croatia", GHA: "Ghana", PAN: "Panama",
};

function normalize(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function tokens(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

// Empareja un nombre contra una lista de candidatos {id, name}. Si hay
// ambiguedad devuelve null (mejor que adivinar mal).
function matchByName(candidates, name) {
  const target = normalize(name);
  const exact = candidates.filter((c) => normalize(c.name) === target);
  if (exact.length === 1) return exact[0];

  const tk = tokens(name);
  const surname = tk[tk.length - 1];
  if (!surname) return null;

  const bySurname = candidates.filter((c) => {
    const t = tokens(c.name);
    return t[t.length - 1] === surname;
  });
  if (bySurname.length === 1) return bySurname[0];

  if (bySurname.length > 1 && tk.length > 1) {
    const first = tk[0];
    const narrowed = bySurname.filter((c) =>
      tokens(c.name).some((t) => t === first || t[0] === first[0]),
    );
    if (narrowed.length === 1) return narrowed[0];
  }
  return null;
}

async function apiGet(path, params) {
  const url = new URL(path, baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { headers: { "x-apisports-key": apiKey } });
  if (!response.ok) throw new Error(`API ${path} -> ${response.status}`);
  const json = await response.json();
  if (json.errors && Object.keys(json.errors).length) {
    console.warn(`  Aviso API en ${path}:`, json.errors);
  }
  return json.response ?? [];
}

function findApiTeam(apiTeams, localTeam) {
  const english = ENGLISH_NAME[localTeam.short_name];
  const target = normalize(english ?? localTeam.name);

  // 1. nombre exacto
  let found = apiTeams.find((t) => normalize(t.name) === target);
  if (found) return found;
  // 2. codigo de equipo == short_name
  found = apiTeams.find((t) => (t.code ?? "").toUpperCase() === localTeam.short_name);
  if (found) return found;
  // 3. contiene (Turkey/Turkiye, Bosnia, etc.)
  found = apiTeams.find(
    (t) => normalize(t.name).includes(target) || target.includes(normalize(t.name)),
  );
  return found ?? null;
}

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(
    "sslmode=require",
    "sslmode=no-verify",
  ),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  console.log(`API-Football: liga ${leagueId}, temporada ${season}${DRY_RUN ? " (DRY RUN)" : ""}`);

  // ---- Equipos ----
  const { rows: teamRows } = await client.query(
    "select id, name, short_name, api_football_team_id from public.teams",
  );
  const apiTeamsRaw = await apiGet("/teams", { league: leagueId, season });
  const apiTeams = apiTeamsRaw.map((row) => row.team).filter(Boolean);
  console.log(`Equipos en la API: ${apiTeams.length}`);

  const apiTeamIdByLocalId = new Map();
  const unresolvedTeams = [];
  let teamsUpdated = 0;

  for (const team of teamRows) {
    if (team.api_football_team_id) {
      apiTeamIdByLocalId.set(team.id, team.api_football_team_id);
      continue;
    }
    const apiTeam = findApiTeam(apiTeams, team);
    if (!apiTeam) {
      unresolvedTeams.push(team);
      continue;
    }
    apiTeamIdByLocalId.set(team.id, apiTeam.id);
    if (!DRY_RUN) {
      await client.query(
        "update public.teams set api_football_team_id = $1 where id = $2 and api_football_team_id is null",
        [apiTeam.id, team.id],
      );
    }
    teamsUpdated += 1;
    console.log(`  OK equipo  ${team.short_name} -> ${apiTeam.name} (#${apiTeam.id})`);
  }

  // ---- Jugadores apostados ----
  const { rows: pickedPlayers } = await client.query(`
    select distinct p.id, p.name, p.team_id, p.api_football_player_id,
                    t.short_name, t.name as team_name
    from public.scorer_predictions sp
    join public.players p on p.id = sp.player_id
    join public.teams t on t.id = p.team_id
    order by t.short_name, p.name
  `);
  console.log(`\nJugadores apostados: ${pickedPlayers.length}`);

  const squadCache = new Map();
  const unresolvedPlayers = [];
  let playersUpdated = 0;

  for (const player of pickedPlayers) {
    if (player.api_football_player_id) {
      console.log(`  - ${player.name} (${player.short_name}) ya tenia ID, salto.`);
      continue;
    }
    const apiTeamId = apiTeamIdByLocalId.get(player.team_id);
    if (!apiTeamId) {
      unresolvedPlayers.push({ player, reason: "equipo sin ID de API" });
      continue;
    }

    if (!squadCache.has(apiTeamId)) {
      const squad = await apiGet("/players/squads", { team: apiTeamId });
      squadCache.set(apiTeamId, squad[0]?.players ?? []);
    }
    const squad = squadCache.get(apiTeamId);
    const matched = matchByName(squad, player.name);

    if (!matched) {
      unresolvedPlayers.push({
        player,
        reason: "sin coincidencia clara",
        candidates: squad.slice(0, 30).map((s) => `${s.name} (#${s.id})`),
      });
      continue;
    }

    if (!DRY_RUN) {
      await client.query(
        "update public.players set api_football_player_id = $1 where id = $2 and api_football_player_id is null",
        [matched.id, player.id],
      );
    }
    playersUpdated += 1;
    console.log(`  OK jugador ${player.name} (${player.short_name}) -> ${matched.name} (#${matched.id})`);
  }

  // ---- Informe ----
  console.log("\n=== RESUMEN ===");
  console.log(`Equipos mapeados: ${teamsUpdated}. Jugadores mapeados: ${playersUpdated}.`);

  if (unresolvedTeams.length) {
    console.log(`\nEquipos SIN resolver (${unresolvedTeams.length}) -> revisar a mano:`);
    unresolvedTeams.forEach((t) => console.log(`  - ${t.short_name} (${t.name})`));
  }
  if (unresolvedPlayers.length) {
    console.log(`\nJugadores SIN resolver (${unresolvedPlayers.length}) -> revisar a mano:`);
    unresolvedPlayers.forEach(({ player, reason, candidates }) => {
      console.log(`  - ${player.name} (${player.short_name}): ${reason}`);
      if (candidates) console.log(`      candidatos: ${candidates.join(", ")}`);
    });
  }
  if (!unresolvedTeams.length && !unresolvedPlayers.length) {
    console.log("Todo resuelto. ✔");
  }
  if (DRY_RUN) console.log("\n(DRY RUN: no se escribio nada en la base de datos.)");
} finally {
  await client.end();
}
