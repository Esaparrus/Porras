import {
  BEST_THIRD_SCOPE_KEY,
  buildManualRankMap,
  isBestThirdTieResolved,
  isTieResolved,
  pushUniqueTieGroup,
} from "@/lib/prediction-tiebreaks";
import {
  calculateBestThirdPlacedTeams,
  calculatePredictedGroupStandings,
} from "@/lib/scoring";
import type {
  Match,
  MatchPrediction,
  PredictionTiebreakSelection,
  StandingRow,
  Team,
} from "@/lib/types";

export type ManualTiebreakStatus = {
  pendingGroupTiebreaks: number;
  pendingBestThirdTiebreak: boolean;
  pendingCount: number;
};

export function getManualTiebreakStatus({
  groupLetters,
  matches,
  predictions,
  teams,
  tiebreakSelections,
}: {
  groupLetters: string[];
  matches: Match[];
  predictions: MatchPrediction[];
  teams: Team[];
  tiebreakSelections: PredictionTiebreakSelection[];
}): ManualTiebreakStatus {
  const groupMatches = matches.filter((match) => match.stage === "group");
  const completedGroups = new Set(
    groupLetters.filter((group) =>
      groupMatches
        .filter((match) => match.group_letter === group)
        .every((match) => {
          const prediction = predictions.find((item) => item.match_id === match.id);
          return (
            prediction?.predicted_home_score !== null &&
            prediction?.predicted_home_score !== undefined &&
            prediction?.predicted_away_score !== null &&
            prediction?.predicted_away_score !== undefined
          );
        }),
    ),
  );

  const groupTiebreaks = new Map(
    groupLetters.map((group) => [
      group,
      tiebreakSelections
        .filter(
          (selection) =>
            selection.scope_type === "group" && selection.scope_key === group,
        )
        .sort((left, right) => left.rank - right.rank)
        .map((selection) => selection.team_id),
    ]),
  );

  const unresolvedGroupTies: Array<{ group: string; rows: StandingRow[] }> = [];
  const predictedGroups = groupLetters.map((group) => {
    const groupUnresolved: StandingRow[][] = [];
    const rows = calculatePredictedGroupStandings(
      teams,
      matches,
      predictions,
      group,
      {
        manualRanksByTeamId: buildManualRankMap(groupTiebreaks.get(group)),
        collectUnresolvedTie: (rows) => pushUniqueTieGroup(groupUnresolved, rows),
      },
    );
    groupUnresolved.forEach((rows) => unresolvedGroupTies.push({ group, rows }));
    return rows;
  });

  const pendingGroupTiebreaks = unresolvedGroupTies.filter(
    ({ group, rows }) =>
      completedGroups.has(group) &&
      !isTieResolved(rows, groupTiebreaks.get(group)),
  ).length;
  const allGroupsCompleted = groupMatches.length > 0 && completedGroups.size === groupLetters.length;
  const allGroupPlacementsResolved = allGroupsCompleted && pendingGroupTiebreaks === 0;

  const unresolvedBestThirdTies: Array<{
    rows: StandingRow[];
    qualifyingSlots: number;
  }> = [];
  const bestThirdTiebreak = tiebreakSelections
    .filter(
      (selection) =>
        selection.scope_type === "best_third" &&
        selection.scope_key === BEST_THIRD_SCOPE_KEY,
    )
    .sort((left, right) => left.rank - right.rank)
    .map((selection) => selection.team_id);
  calculateBestThirdPlacedTeams(predictedGroups, {
    manualRanksByTeamId: buildManualRankMap(bestThirdTiebreak),
    collectUnresolvedTie: (rows, meta) => {
      const signature = rows
        .map((row) => row.team.id)
        .sort()
        .join(":");
      const exists = unresolvedBestThirdTies.some(
        (tie) =>
          tie.rows
            .map((row) => row.team.id)
            .sort()
            .join(":") === signature,
      );
      if (exists) return;
      unresolvedBestThirdTies.push({
        rows,
        qualifyingSlots: meta?.qualifyingSlots ?? rows.length,
      });
    },
  });
  const pendingBestThirdTiebreak =
    allGroupPlacementsResolved &&
    unresolvedBestThirdTies.some(
      ({ rows, qualifyingSlots }) =>
        !isBestThirdTieResolved(rows, bestThirdTiebreak, qualifyingSlots),
    );

  return {
    pendingGroupTiebreaks,
    pendingBestThirdTiebreak,
    pendingCount: pendingGroupTiebreaks + (pendingBestThirdTiebreak ? 1 : 0),
  };
}
