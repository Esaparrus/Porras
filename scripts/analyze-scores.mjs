// SOLO LECTURA — analiza la tabla `scores` y detecta puntuaciones en 0.
// NO escribe nada. Solo SELECTs.
//
// Uso:  node scripts/analyze-scores.mjs

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
async function fetchAll(table, columns, filters = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await filters(
      supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1),
    );
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

const leagues = await fetchAll("leagues", "id, name, status");
const leagueById = new Map(leagues.map((l) => [l.id, l]));
const profiles = await fetchAll("profiles", "id, username, display_name");
const profileById = new Map(profiles.map((p) => [p.id, p]));

const scores = await fetchAll(
  "scores",
  "league_id, user_id, total_points, match_points, group_points, knockout_points, scorer_points, award_points, exact_scores_count, champion_hit",
);

console.log(`Total filas en scores: ${scores.length}\n`);

const COMPONENTS = [
  "total_points",
  "match_points",
  "group_points",
  "knockout_points",
  "scorer_points",
  "award_points",
];

// ── Resumen global por componente ──────────────────────────────
console.log("=== Distribución por componente ===");
for (const c of COMPONENTS) {
  const vals = scores.map((s) => s[c] ?? 0);
  const zeros = vals.filter((v) => v === 0).length;
  const nulls = scores.filter((s) => s[c] === null || s[c] === undefined).length;
  const max = Math.max(...vals, 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  console.log(
    `  ${c.padEnd(18)} ceros=${String(zeros).padStart(4)}  null=${String(nulls).padStart(4)}  max=${String(max).padStart(5)}  media=${(sum / scores.length).toFixed(1)}`,
  );
}

// ── Usuarios con total_points = 0 ──────────────────────────────
const zeroTotal = scores.filter((s) => (s.total_points ?? 0) === 0);
console.log(`\n=== Usuarios con total_points = 0 (${zeroTotal.length}) ===`);
const byLeague = new Map();
for (const s of zeroTotal) {
  const arr = byLeague.get(s.league_id) ?? [];
  arr.push(s);
  byLeague.set(s.league_id, arr);
}
for (const [lid, arr] of byLeague) {
  const lg = leagueById.get(lid);
  console.log(`\n  Liga: ${lg?.name ?? lid} [${lg?.status ?? "?"}]  (${arr.length} usuarios en 0)`);
  for (const s of arr) {
    const p = profileById.get(s.user_id);
    const name = p?.display_name || p?.username || s.user_id;
    // desglose de componentes para ver si TODO es 0 o solo el total
    const breakdown = COMPONENTS.filter((c) => c !== "total_points")
      .map((c) => `${c.replace("_points", "")}=${s[c] ?? 0}`)
      .join(" ");
    console.log(`    - ${String(name).padEnd(24)} ${breakdown}`);
  }
}

// ── Coherencia: total vs suma de componentes ───────────────────
console.log("\n=== Coherencia total_points vs suma de componentes ===");
let mismatches = 0;
for (const s of scores) {
  const sum =
    (s.match_points ?? 0) +
    (s.group_points ?? 0) +
    (s.knockout_points ?? 0) +
    (s.scorer_points ?? 0) +
    (s.award_points ?? 0);
  if (sum !== (s.total_points ?? 0)) {
    mismatches++;
    if (mismatches <= 15) {
      const p = profileById.get(s.user_id);
      const name = p?.display_name || p?.username || s.user_id;
      const lg = leagueById.get(s.league_id);
      console.log(
        `  ⚠ ${String(name).padEnd(20)} [${lg?.name ?? s.league_id}]  total=${s.total_points} pero suma=${sum}`,
      );
    }
  }
}
console.log(mismatches === 0 ? "  ✓ Todos los totales coinciden con la suma." : `  Total descuadres: ${mismatches}`);
