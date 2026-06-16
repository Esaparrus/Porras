import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

// Mismo patron que scripts/apply-schema-migration.mjs (pooler + ssl no-verify):
// el certificado directo de Supabase es self-signed, por eso se usa este modo.
const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING
    .replace(":5432/", ":6543/")
    .replace("sslmode=require", "sslmode=no-verify"),
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(await readFile("supabase/add-castigo.sql", "utf8"));
  const { rows } = await client.query(`
    select column_name, data_type, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'league_members'
      and column_name = 'castigo_pending'
  `);
  console.log("Columna castigo_pending:", rows[0] ?? "NO CREADA");
} finally {
  await client.end();
}
