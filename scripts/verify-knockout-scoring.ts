/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Verifica el nuevo scoring de eliminatorias con las funciones REALES:
 *  A) gating del marcador por ambas selecciones + bonus de ganador = 0
 *  B) puntos por "llega a ronda" (reached) sin doble conteo del campeon
 *  C) reconstruccion del bracket predicho sobre datos reales de la BD
 *
 * Ejecutar:  npx tsx scripts/verify-knockout-scoring.ts
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_POINT_SETTINGS } from "@/lib/constants";
import { buildPredictedKnockoutEntrants } from "@/lib/knockout-bracket";
import {
  calculateKnockoutReachedPoints,
  calculateLiveKnockoutMatchPoints,
  calculatePredictedGroupStandings,
  calculateBestThirdPlacedTeams,
} from "@/lib/scoring";
import type { Match, MatchPrediction, PointSettings } from "@/lib/types";

const S = { league_id: "L", ...DEFAULT_POINT_SETTINGS } as PointSettings;

let pass = 0;
let fail = 0;
const check = (label: string, got: any, expected: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(52)} got=${got}  exp=${expected}`);
  ok ? pass++ : fail++;
};

const koMatch = (over: Partial<Match>): Match =>
  ({
    id: over.id ?? "m",
    match_number: over.match_number ?? 90,
    stage: over.stage ?? "round_16",
    group_letter: null,
    home_team_id: over.home_team_id ?? "ESP",
    away_team_id: over.away_team_id ?? "FRA",
    home_placeholder: null,
    away_placeholder: null,
    winner_team_id: over.winner_team_id ?? null,
    match_date: null,
    venue: null,
    home_score: over.home_score ?? null,
    away_score: over.away_score ?? null,
    is_finished: over.is_finished ?? true,
    is_locked: false,
    created_at: "",
  }) as Match;

const pred = (homeS: number, awayS: number, winner: string): MatchPrediction => ({
  id: "p",
  league_id: "L",
  user_id: "u",
  match_id: "m",
  predicted_home_score: homeS,
  predicted_away_score: awayS,
  predicted_winner_team_id: winner,
  points: 0,
});

// ────────────────────────────────────────────────────────────────
console.log("A) Gating del marcador por ambas selecciones (octavos, real ESP 2-1 FRA)");
// octavos: sign 3, gd 2, exact 4, winner 0 (en DEFAULT). Exacto+sign+gd = 9.
const real = koMatch({ home_score: 2, away_score: 1, winner_team_id: "ESP" });
const p = pred(2, 1, "ESP"); // marcador exacto + ganador correcto

check(
  "ambas selecciones correctas (ESP/FRA) -> 9",
  calculateLiveKnockoutMatchPoints(p, real, S, { homeTeamId: "ESP", awayTeamId: "FRA" }),
  9,
);
check(
  "visitante equivocado (ESP/GER) -> 0",
  calculateLiveKnockoutMatchPoints(p, real, S, { homeTeamId: "ESP", awayTeamId: "GER" }),
  0,
);
check(
  "local equivocado (POR/FRA) -> 0",
  calculateLiveKnockoutMatchPoints(p, real, S, { homeTeamId: "POR", awayTeamId: "FRA" }),
  0,
);
check(
  "selecciones cambiadas de lado (FRA/ESP) -> 0",
  calculateLiveKnockoutMatchPoints(p, real, S, { homeTeamId: "FRA", awayTeamId: "ESP" }),
  0,
);
check(
  "sin entrants (no verificable) -> 0",
  calculateLiveKnockoutMatchPoints(p, real, S, undefined),
  0,
);
check(
  "bonus de ganador desactivado: predigo bien ganador pero cruce mal -> 0",
  calculateLiveKnockoutMatchPoints(p, real, S, { homeTeamId: "ESP", awayTeamId: "GER" }),
  0,
);

// ────────────────────────────────────────────────────────────────
console.log("\nB) Puntos por 'llega a ronda' (R16=10, sin contar campeon)");
const matchesB: Match[] = [
  koMatch({ id: "k1", match_number: 89, stage: "round_16", home_team_id: "ESP", away_team_id: "FRA" }),
];
check(
  "predigo ESP y FRA (ambos llegan) -> 20",
  calculateKnockoutReachedPoints(matchesB, new Map([[89, { homeTeam: { id: "ESP" } as any, awayTeam: { id: "FRA" } as any }]]), S),
  20,
);
check(
  "predigo ESP y GER (solo ESP llega) -> 10",
  calculateKnockoutReachedPoints(matchesB, new Map([[89, { homeTeam: { id: "ESP" } as any, awayTeam: { id: "GER" } as any }]]), S),
  10,
);
check(
  "el avance no depende de la posicion (FRA/ESP) -> 20",
  calculateKnockoutReachedPoints(matchesB, new Map([[89, { homeTeam: { id: "FRA" } as any, awayTeam: { id: "ESP" } as any }]]), S),
  20,
);
// La final no debe sumar 'reached' por campeon (se premia aparte)
const finalReal: Match[] = [
  koMatch({ id: "fin", match_number: 104, stage: "final", home_team_id: "ESP", away_team_id: "ARG" }),
];
check(
  "finalistas correctos -> 2x final reached (32) = 64",
  calculateKnockoutReachedPoints(finalReal, new Map([[104, { homeTeam: { id: "ESP" } as any, awayTeam: { id: "ARG" } as any }]]), S),
  64,
);

// ────────────────────────────────────────────────────────────────
void (async () => {
console.log("\nC) Reconstruccion del bracket predicho sobre datos reales");
loadEnvConfig(process.cwd());
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const { data: lg } = await supabase.from("leagues").select("id,name").ilike("name", "Arazuri").single();
const { data: matches } = await supabase.from("matches").select("*");
const { data: teams } = await supabase.from("teams").select("*");
const teamName = new Map((teams ?? []).map((t: any) => [t.id, t.name]));
// Un usuario con apuestas
const { data: anyPred } = await supabase
  .from("match_predictions")
  .select("user_id")
  .eq("league_id", lg!.id)
  .limit(1)
  .single();
const { data: preds } = await supabase
  .from("match_predictions")
  .select("*")
  .eq("league_id", lg!.id)
  .eq("user_id", anyPred!.user_id);

const groupLetters = Array.from(
  new Set((teams ?? []).map((t: any) => t.group_letter).filter(Boolean)),
) as string[];
const groupPreds = (preds ?? []).filter((p: any) => {
  const m = (matches ?? []).find((x: any) => x.id === p.match_id);
  return m?.stage === "group";
});
const predictedGroups = groupLetters.map((g) =>
  calculatePredictedGroupStandings(teams as any, matches as any, groupPreds as any, g),
);
const predictedGroupsMap = new Map(groupLetters.map((g, i) => [g, predictedGroups[i]]));
const bestThirds = calculateBestThirdPlacedTeams(predictedGroups);
const byId = new Map((preds ?? []).map((p: any) => [p.match_id, p]));
const entrants = buildPredictedKnockoutEntrants(
  matches as any,
  predictedGroupsMap,
  bestThirds,
  (id) => {
    const pr = byId.get(id) as any;
    return pr ? { winnerId: pr.predicted_winner_team_id, homeScore: pr.predicted_home_score, awayScore: pr.predicted_away_score } : undefined;
  },
);
const finalEntrants = entrants.get(104);
const r32sample = entrants.get(73);
console.log(`  Usuario: ${anyPred!.user_id.slice(0, 8)}  (grupos predichos: ${groupPreds.length})`);
console.log(`  R32 #73 entrants:  ${teamName.get(r32sample?.homeTeam?.id) ?? "—"}  vs  ${teamName.get(r32sample?.awayTeam?.id) ?? "—"}`);
console.log(`  FINAL #104:        ${teamName.get(finalEntrants?.homeTeam?.id) ?? "—"}  vs  ${teamName.get(finalEntrants?.awayTeam?.id) ?? "—"}`);
const finalResolved = Boolean(finalEntrants?.homeTeam && finalEntrants?.awayTeam);
check("la final del bracket predicho se resuelve a dos selecciones", finalResolved, true);

console.log(`\n${fail === 0 ? "✅ TODO OK" : "❌ FALLOS"}: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
})();
