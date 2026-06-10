// Aplica el nuevo baremo de puntos a la liga Arazuri.
// Escribe en league_point_settings (UPDATE sobre la fila existente) y verifica.
//
// Uso:  node scripts/update-point-settings.mjs

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Solo los campos que cambian respecto a lo que ya había.
const CHANGES = {
  // Partidos de grupos: exacto > diferencia
  match_goal_difference_points: 2, // antes 3
  match_exact_score_points: 4, // antes 3
  // Cuadro inicial: escalado más agresivo (engancha hasta el final)
  knockout_round_16_reached_points: 10, // antes 8
  knockout_quarter_reached_points: 16, // antes 12
  knockout_semi_reached_points: 24, // antes 18
  knockout_final_reached_points: 32, // antes 25
  knockout_champion_points: 70, // antes 60
  knockout_runner_up_points: 40, // antes 35
  // Eliminatoria en vivo: exacto > diferencia + más peso por ronda
  live_round_32_sign_points: 3,
  live_round_32_goal_difference_points: 2,
  live_round_32_exact_score_bonus: 4,
  live_round_16_sign_points: 3,
  live_round_16_goal_difference_points: 2,
  live_round_16_exact_score_bonus: 4,
  live_quarter_sign_points: 3,
  live_quarter_goal_difference_points: 2,
  live_quarter_exact_score_bonus: 5,
  live_semi_goal_difference_points: 3,
  live_semi_exact_score_bonus: 6,
  live_third_place_sign_points: 3,
  live_third_place_goal_difference_points: 2,
  live_third_place_exact_score_bonus: 4,
  live_final_sign_points: 5,
  live_final_goal_difference_points: 3,
  live_final_exact_score_bonus: 8,
};

const { data: league } = await supabase
  .from("leagues")
  .select("id, name")
  .ilike("name", "Arazuri")
  .maybeSingle();
if (!league) throw new Error("No se encontró la liga Arazuri");

const { data: before } = await supabase
  .from("league_point_settings")
  .select("*")
  .eq("league_id", league.id)
  .single();

const { data: after, error } = await supabase
  .from("league_point_settings")
  .update(CHANGES)
  .eq("league_id", league.id)
  .select("*")
  .single();
if (error) throw error;

console.log(`Liga: ${league.name}\n`);
console.log("Campo".padEnd(38), "antes", "->", "ahora");
for (const k of Object.keys(CHANGES)) {
  console.log(`${k.padEnd(38)} ${String(before[k]).padStart(5)}  -> ${String(after[k]).padStart(5)}`);
}
console.log("\n✓ Actualizado correctamente.");
