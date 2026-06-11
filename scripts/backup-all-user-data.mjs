// Backup COMPLETO de todos los datos de la gente (solo lectura).
// Vuelca a un JSON con timestamp todas las tablas con apuestas / resultados
// de los usuarios, por si algo se borra. NO escribe nada en la BD.
//
// Uso:  node scripts/backup-all-user-data.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PAGE_SIZE = 1000;
async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

// Todas las tablas con datos de la gente (apuestas, resultados, puntuaciones).
const TABLES = [
  "profiles",
  "league_members",
  "match_predictions",
  "scorer_predictions",
  "award_predictions",
  "prediction_tiebreak_selections",
  "player_selection_requests",
  "scores",
  "final_awards",
  "league_player_goals",
  "league_point_settings",
  "ranking_daily_snapshots",
];

(async () => {
  const host = url.replace(/^https?:\/\//, "").split(".")[0];
  console.log(`Backup desde BD: ${host}\n`);

  const backup = {
    _meta: {
      created_at: new Date().toISOString(),
      db_ref: host,
      tables: {},
    },
  };

  for (const table of TABLES) {
    try {
      const rows = await fetchAll(table);
      backup[table] = rows;
      backup._meta.tables[table] = rows.length;
      console.log(`  ${table.padEnd(32)} ${rows.length} filas`);
    } catch (e) {
      backup[table] = { _error: String(e.message ?? e) };
      backup._meta.tables[table] = `ERROR: ${e.message ?? e}`;
      console.log(`  ${table.padEnd(32)} ERROR: ${e.message ?? e}`);
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = dirname(fileURLToPath(import.meta.url));
  const outPath = join(outDir, `backup-all-user-data-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(backup, null, 2), "utf8");

  const total = Object.values(backup._meta.tables)
    .filter((v) => typeof v === "number")
    .reduce((a, b) => a + b, 0);
  console.log(`\nTotal: ${total} filas guardadas en:\n  ${outPath}`);
})();
