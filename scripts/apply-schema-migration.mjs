import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(
    "sslmode=require",
    "sslmode=no-verify",
  ),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(await readFile("supabase/migrate-world-cup-2026.sql", "utf8"));
  await client.query(await readFile("supabase/add-manual-scorer-goal-overrides.sql", "utf8"));
  await client.query(`
    update public.teams
    set flag_code = case short_name
      when 'MEX' then 'mx' when 'RSA' then 'za' when 'KOR' then 'kr' when 'CZE' then 'cz'
      when 'CAN' then 'ca' when 'SUI' then 'ch' when 'QAT' then 'qa' when 'BIH' then 'ba'
      when 'BRA' then 'br' when 'MAR' then 'ma' when 'HAI' then 'ht' when 'SCO' then 'gb-sct'
      when 'USA' then 'us' when 'PAR' then 'py' when 'AUS' then 'au' when 'TUR' then 'tr'
      when 'GER' then 'de' when 'CUW' then 'cw' when 'CIV' then 'ci' when 'ECU' then 'ec'
      when 'NED' then 'nl' when 'JPN' then 'jp' when 'TUN' then 'tn' when 'SWE' then 'se'
      when 'BEL' then 'be' when 'EGY' then 'eg' when 'IRN' then 'ir' when 'NZL' then 'nz'
      when 'ESP' then 'es' when 'CPV' then 'cv' when 'KSA' then 'sa' when 'URU' then 'uy'
      when 'FRA' then 'fr' when 'SEN' then 'sn' when 'NOR' then 'no' when 'IRQ' then 'iq'
      when 'ARG' then 'ar' when 'ALG' then 'dz' when 'AUT' then 'at' when 'JOR' then 'jo'
      when 'POR' then 'pt' when 'UZB' then 'uz' when 'COL' then 'co' when 'COD' then 'cd'
      when 'ENG' then 'gb-eng' when 'CRO' then 'hr' when 'GHA' then 'gh' when 'PAN' then 'pa'
      else flag_code
    end
  `);

  const { rows } = await client.query(`
    select
      count(*) filter (where flag_code is not null) as flags,
      count(*) as teams
    from public.teams
  `);
  console.log(rows[0]);
} finally {
  await client.end();
}
