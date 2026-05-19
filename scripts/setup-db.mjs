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

async function runSqlFile(filePath) {
  const sql = await readFile(filePath, "utf8");
  await client.query(sql);
  console.log(`SQL aplicado: ${filePath}`);
}

await client.connect();

try {
  await runSqlFile(join(process.cwd(), "supabase", "schema.sql"));
  await runSqlFile(join(process.cwd(), "supabase", "seed.sql"));
} finally {
  await client.end();
}
