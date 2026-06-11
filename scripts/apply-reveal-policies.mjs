import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING
    .replace(":5432/", ":6543/")
    .replace("sslmode=require", "sslmode=no-verify"),
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  // Limpia cualquier variante previa (guion bajo y espacios) para que sea idempotente.
  for (const table of ["scorer_predictions", "award_predictions", "prediction_tiebreak_selections"]) {
    const spaced = table.replace(/_/g, " ");
    await client.query(`drop policy if exists "${table} visible read" on public.${table}`);
    await client.query(`drop policy if exists "${spaced} visible read" on public.${table}`);
  }

  // Aplica la migracion fuente (nombres con espacios, igual que schema.sql).
  await client.query(await readFile("supabase/reveal-scorer-award-predictions.sql", "utf8"));

  const { rows } = await client.query(`
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('scorer_predictions','award_predictions','prediction_tiebreak_selections')
    order by tablename, policyname
  `);
  console.log("Politicas actuales:");
  rows.forEach((r) => console.log(`  ${r.tablename.padEnd(32)} ${r.policyname}`));
} finally {
  await client.end();
}
