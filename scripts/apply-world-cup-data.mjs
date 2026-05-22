import { readFile } from "node:fs/promises";
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

async function runSqlFile(filePath) {
  const sql = await readFile(filePath, "utf8");
  await client.query(sql);
  console.log(`SQL aplicado: ${filePath}`);
}

await client.connect();

try {
  await runSqlFile("supabase/migrate-world-cup-2026.sql");
  await runSqlFile("supabase/seed.sql");

  const { rows } = await client.query(`
    select
      (select count(*) from public.teams) as teams,
      (select count(*) from public.matches) as matches,
      (select count(distinct group_letter) from public.teams where group_letter is not null) as groups,
      (select count(*) from public.players where is_active) as players
  `);

  console.log(rows[0]);
} finally {
  await client.end();
}
