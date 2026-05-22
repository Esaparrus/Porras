import { readFile } from "node:fs/promises";
import { join } from "node:path";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const databaseUrl = process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
  throw new Error("Falta POSTGRES_URL_NON_POOLING en .env.local");
}

const client = new pg.Client({
  connectionString: databaseUrl.replace("sslmode=require", "sslmode=no-verify"),
  ssl: { rejectUnauthorized: false },
});

const SQL_FILES = [
  "add-username-login.sql",
  "migrate-world-cup-2026.sql",
  "league-economy-and-payments.sql",
  "player-selection-requests.sql",
  "seed.sql",
];

async function runSqlFile(filePath) {
  const sql = await readFile(filePath, "utf8");
  await client.query(sql);
  console.log(`SQL aplicado: ${filePath}`);
}

await client.connect();

try {
  for (const fileName of SQL_FILES) {
    await runSqlFile(join(process.cwd(), "supabase", fileName));
  }

  const { rows } = await client.query(`
    select
      (select count(*) from public.leagues) as leagues,
      (select count(*) from public.profiles) as profiles,
      (select count(*) from public.teams) as teams,
      (select count(*) from public.matches) as matches,
      (select count(*) from public.players where is_active) as active_players
  `);

  console.log(rows[0]);
} finally {
  await client.end();
}
