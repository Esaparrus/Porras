import type { Match, StandingRow, Team } from "@/lib/types";
import { getThirdPlaceAssignments } from "@/lib/world-cup-third-place-assignments";

// Topología del cuadro (Mundial 2026). Fuente única compartida entre el cliente
// (prediction-workflow) y el motor de puntuación (scoring/recálculo), para que el
// bracket predicho se reconstruya igual en ambos sitios.
export const ROUND_32_SLOTS: Record<number, [string, string]> = {
  73: ["2A", "2B"],
  74: ["1E", "3ABCDF"],
  75: ["1F", "2C"],
  76: ["1C", "2F"],
  77: ["1I", "3CDFGH"],
  78: ["2E", "2I"],
  79: ["1A", "3CEFHI"],
  80: ["1L", "3EHIJK"],
  81: ["1D", "3BEFIJ"],
  82: ["1G", "3AEHIJ"],
  83: ["2K", "2L"],
  84: ["1H", "2J"],
  85: ["1B", "3EFGIJ"],
  86: ["1J", "2H"],
  87: ["1K", "3DEIJL"],
  88: ["2D", "2G"],
};

export const WINNER_SLOTS: Record<number, [number, number]> = {
  89: [74, 77],
  90: [73, 75],
  91: [76, 78],
  92: [79, 80],
  93: [83, 84],
  94: [81, 82],
  95: [86, 88],
  96: [85, 87],
  97: [89, 90],
  98: [93, 94],
  99: [91, 92],
  100: [95, 96],
  101: [97, 98],
  102: [99, 100],
  104: [101, 102],
};

export const LOSER_SLOTS: Record<number, [number, number]> = {
  103: [101, 102],
};

// Distribución visual del cuadro tipo póster: dos mitades que convergen en la
// final del centro. Compartida entre el formulario (prediction-workflow) y la
// vista de solo lectura (player-bets-view) para que el árbol se dibuje igual.
export type BracketColumn = {
  stage: "round_32" | "round_16" | "quarter_final" | "semi_final";
  matchNumbers: readonly number[];
};

export const LEFT_BRACKET_COLUMNS: readonly BracketColumn[] = [
  { stage: "round_32", matchNumbers: [74, 77, 73, 75, 83, 84, 81, 82] },
  { stage: "round_16", matchNumbers: [89, 90, 93, 94] },
  { stage: "quarter_final", matchNumbers: [97, 98] },
  { stage: "semi_final", matchNumbers: [101] },
];

export const RIGHT_BRACKET_COLUMNS: readonly BracketColumn[] = [
  { stage: "semi_final", matchNumbers: [102] },
  { stage: "quarter_final", matchNumbers: [99, 100] },
  { stage: "round_16", matchNumbers: [91, 92, 95, 96] },
  { stage: "round_32", matchNumbers: [76, 78, 79, 80, 86, 88, 85, 87] },
];

export type BracketEntrants = { homeTeam: Team | null; awayTeam: Team | null };

// Predicción mínima necesaria para resolver un cruce: o el ganador marcado, o el marcador.
export type BracketPrediction = {
  winnerId: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

function resolveGroupSlot(
  slot: string,
  pairedSlot: string,
  standingsByGroup: Map<string, StandingRow[]>,
  thirdPlaceAssignments: ReturnType<typeof getThirdPlaceAssignments>,
): Team | null {
  const position = Number(slot[0]);
  if (position === 1 || position === 2) {
    const group = slot[1];
    return standingsByGroup.get(group)?.[position - 1]?.team ?? null;
  }
  // Tercer puesto: se asigna contra un primero de grupo (pairedSlot empieza por "1").
  if (!thirdPlaceAssignments || !pairedSlot.startsWith("1")) return null;
  return thirdPlaceAssignments.get(pairedSlot)?.team ?? null;
}

function winnerOf(
  entrants: BracketEntrants | undefined,
  prediction: BracketPrediction | undefined,
): Team | null {
  if (!entrants) return null;
  const { homeTeam, awayTeam } = entrants;
  if (prediction?.winnerId && homeTeam && prediction.winnerId === homeTeam.id) return homeTeam;
  if (prediction?.winnerId && awayTeam && prediction.winnerId === awayTeam.id) return awayTeam;
  if (prediction?.homeScore != null && prediction?.awayScore != null) {
    if (prediction.homeScore > prediction.awayScore) return homeTeam ?? null;
    if (prediction.awayScore > prediction.homeScore) return awayTeam ?? null;
  }
  return null;
}

// Id del equipo que el usuario predijo como ganador de un cruce (o null).
export function predictedWinnerId(
  entrants: BracketEntrants | undefined,
  prediction: BracketPrediction | undefined,
): string | null {
  return winnerOf(entrants, prediction)?.id ?? null;
}

function loserOf(
  entrants: BracketEntrants | undefined,
  prediction: BracketPrediction | undefined,
): Team | null {
  const winner = winnerOf(entrants, prediction);
  if (!winner || !entrants) return null;
  if (entrants.homeTeam && winner.id === entrants.homeTeam.id) return entrants.awayTeam ?? null;
  if (entrants.awayTeam && winner.id === entrants.awayTeam.id) return entrants.homeTeam ?? null;
  return null;
}

/**
 * Reconstruye, partido a partido, qué dos selecciones colocó el usuario en cada
 * cruce de eliminatoria, encadenando desde sus clasificaciones de grupo predichas
 * y sus ganadores predichos. Es la base para:
 *  - puntos por "llega a ronda" (comparando contra el cuadro real)
 *  - validar que el marcador exacto solo cuente si acierta ambas selecciones
 *
 * Devuelve un Map por número de partido. Cualquier hueco no resoluble queda null.
 */
export function buildPredictedKnockoutEntrants(
  matches: Match[],
  standingsByGroup: Map<string, StandingRow[]>,
  bestThirds: StandingRow[],
  getPrediction: (matchId: string) => BracketPrediction | undefined,
): Map<number, BracketEntrants> {
  const byNumber = new Map(matches.map((match) => [match.match_number ?? 0, match]));
  const thirdPlaceAssignments = getThirdPlaceAssignments(bestThirds);
  const entrants = new Map<number, BracketEntrants>();

  for (const [numberText, [homeSlot, awaySlot]] of Object.entries(ROUND_32_SLOTS)) {
    const number = Number(numberText);
    if (!byNumber.has(number)) continue;
    entrants.set(number, {
      homeTeam: resolveGroupSlot(homeSlot, awaySlot, standingsByGroup, thirdPlaceAssignments),
      awayTeam: resolveGroupSlot(awaySlot, homeSlot, standingsByGroup, thirdPlaceAssignments),
    });
  }

  // De menor a mayor número: cada cruce depende solo de partidos con número inferior.
  for (const number of Object.keys(WINNER_SLOTS).map(Number).sort((a, b) => a - b)) {
    if (!byNumber.has(number)) continue;
    const [homeSource, awaySource] = WINNER_SLOTS[number];
    const homeMatch = byNumber.get(homeSource);
    const awayMatch = byNumber.get(awaySource);
    entrants.set(number, {
      homeTeam: homeMatch ? winnerOf(entrants.get(homeSource), getPrediction(homeMatch.id)) : null,
      awayTeam: awayMatch ? winnerOf(entrants.get(awaySource), getPrediction(awayMatch.id)) : null,
    });
  }

  for (const number of Object.keys(LOSER_SLOTS).map(Number).sort((a, b) => a - b)) {
    if (!byNumber.has(number)) continue;
    const [homeSource, awaySource] = LOSER_SLOTS[number];
    const homeMatch = byNumber.get(homeSource);
    const awayMatch = byNumber.get(awaySource);
    entrants.set(number, {
      homeTeam: homeMatch ? loserOf(entrants.get(homeSource), getPrediction(homeMatch.id)) : null,
      awayTeam: awayMatch ? loserOf(entrants.get(awaySource), getPrediction(awayMatch.id)) : null,
    });
  }

  return entrants;
}
