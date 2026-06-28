import {
  buildPredictedKnockoutEntrants,
  type BracketEntrants,
} from "@/lib/knockout-bracket";
import {
  BEST_THIRD_SCOPE_KEY,
  buildManualRankMap,
  buildTiebreakDraft,
  getTiebreakScopeId,
} from "@/lib/prediction-tiebreaks";
import {
  calculateBestThirdPlacedTeams,
  calculatePredictedGroupStandings,
} from "@/lib/scoring";
import type {
  Match,
  MatchPrediction,
  PointSettings,
  PredictionTiebreakSelection,
  Team,
} from "@/lib/types";

// A qué ronda "llega" el ganador de cada eliminatoria. Sirve para avisar en el
// calendario de que, si pasa una selección que tú colocaste en la siguiente
// ronda, te llevas los puntos de "selección clasificada".
export const NEXT_REACHED_STAGE: Record<string, string> = {
  round_32: "round_16",
  round_16: "quarter_final",
  quarter_final: "semi_final",
  semi_final: "final",
  final: "champion",
};

// Puntos de "llega a ronda" (selección clasificada) para cada ronda alcanzada.
export function reachedPointsForStage(stage: string, settings: PointSettings): number {
  switch (stage) {
    case "round_32":
      return settings.knockout_round_32_reached_points;
    case "round_16":
      return settings.knockout_round_16_reached_points;
    case "quarter_final":
      return settings.knockout_quarter_reached_points;
    case "semi_final":
      return settings.knockout_semi_reached_points;
    case "final":
      return settings.knockout_final_reached_points;
    case "champion":
      return settings.knockout_champion_points;
    default:
      return 0;
  }
}

// Equipos que de verdad alcanzan cada ronda (los que la juegan), por stage.
export function buildRealReachedByStage(matches: Match[]): Map<string, Set<string>> {
  const byStage = new Map<string, Set<string>>();
  for (const match of matches) {
    if (match.stage === "group") continue;
    const set = byStage.get(match.stage) ?? new Set<string>();
    if (match.home_team_id) set.add(match.home_team_id);
    if (match.away_team_id) set.add(match.away_team_id);
    byStage.set(match.stage, set);
  }
  return byStage;
}

// Equipos que el usuario colocó en cada ronda (según su cuadro), por stage.
// Añade la "ronda" champion con el campeón que predijo (ganador de la final).
export function buildPredictedReachedByStage(
  matches: Match[],
  entrants: Map<number, BracketEntrants>,
  predictedChampionId: string | null,
): Map<string, Set<string>> {
  const byStage = new Map<string, Set<string>>();
  for (const match of matches) {
    if (match.stage === "group") continue;
    const reachers = entrants.get(match.match_number ?? 0);
    const set = byStage.get(match.stage) ?? new Set<string>();
    if (reachers?.homeTeam) set.add(reachers.homeTeam.id);
    if (reachers?.awayTeam) set.add(reachers.awayTeam.id);
    byStage.set(match.stage, set);
  }
  byStage.set("champion", new Set(predictedChampionId ? [predictedChampionId] : []));
  return byStage;
}

// Reconstruye el cuadro de eliminatorias que se deriva de las apuestas de UN
// usuario (clasificaciones de grupo previstas + desempates manuales + ganadores).
// Es la misma cadena que usan el recálculo de puntos y la ficha de jugador; se
// centraliza aquí para reutilizarla también en las vistas (calendario y detalle).
export function buildUserKnockoutEntrants({
  teams,
  matches,
  predictions,
  tiebreakSelections,
  groupLetters,
}: {
  teams: Team[];
  matches: Match[];
  predictions: MatchPrediction[];
  tiebreakSelections: PredictionTiebreakSelection[];
  groupLetters?: string[];
}): Map<number, BracketEntrants> {
  const letters =
    groupLetters ??
    (Array.from(
      new Set(teams.map((team) => team.group_letter).filter(Boolean)),
    ) as string[]);
  const tiebreakDraft = buildTiebreakDraft(tiebreakSelections);
  const predictionByMatchId = new Map(
    predictions.map((prediction) => [prediction.match_id, prediction]),
  );

  const standingsByGroup = new Map(
    letters.map((group) => [
      group,
      calculatePredictedGroupStandings(teams, matches, predictions, group, {
        manualRanksByTeamId: buildManualRankMap(
          tiebreakDraft[getTiebreakScopeId("group", group)],
        ),
      }),
    ]),
  );
  const bestThirds = calculateBestThirdPlacedTeams(
    Array.from(standingsByGroup.values()),
    {
      manualRanksByTeamId: buildManualRankMap(
        tiebreakDraft[getTiebreakScopeId("best_third", BEST_THIRD_SCOPE_KEY)],
      ),
    },
  );

  return buildPredictedKnockoutEntrants(
    matches,
    standingsByGroup,
    bestThirds,
    (matchId) => {
      const prediction = predictionByMatchId.get(matchId);
      if (!prediction) return undefined;
      return {
        winnerId: prediction.predicted_winner_team_id,
        homeScore: prediction.predicted_home_score,
        awayScore: prediction.predicted_away_score,
      };
    },
  );
}

// El marcador de una eliminatoria solo cuenta (y por tanto solo se muestra) si el
// usuario colocó en ese cruce las dos selecciones que de verdad lo disputan, en su
// posición. Misma condición `bothTeamsCorrect` que aplica la puntuación en vivo.
export function knockoutMarkerCounts(
  match: Pick<Match, "home_team_id" | "away_team_id">,
  entrants: BracketEntrants | undefined,
): boolean {
  return (
    match.home_team_id != null &&
    match.away_team_id != null &&
    entrants?.homeTeam?.id === match.home_team_id &&
    entrants?.awayTeam?.id === match.away_team_id
  );
}
