import { DEFAULT_POINT_SETTINGS } from "@/lib/constants";
import type {
  Match,
  MatchPrediction,
  PointSettings,
  StandingRow,
  Team,
} from "@/lib/types";
import { footballSign } from "@/lib/utils";

export function calculateMatchPredictionPoints(
  prediction: Pick<
    MatchPrediction,
    "predicted_home_score" | "predicted_away_score"
  >,
  match: Pick<Match, "home_score" | "away_score" | "is_finished">,
  settings: Pick<PointSettings, "match_exact_score_points" | "match_sign_points">,
) {
  if (
    !match.is_finished ||
    match.home_score === null ||
    match.away_score === null ||
    prediction.predicted_home_score === null ||
    prediction.predicted_away_score === null
  ) {
    return { points: 0, exact: false };
  }

  const exact =
    prediction.predicted_home_score === match.home_score &&
    prediction.predicted_away_score === match.away_score;

  if (exact) return { points: settings.match_exact_score_points, exact: true };

  const predictedSign = footballSign(
    prediction.predicted_home_score,
    prediction.predicted_away_score,
  );
  const realSign = footballSign(match.home_score, match.away_score);

  return {
    points: predictedSign === realSign ? settings.match_sign_points : 0,
    exact: false,
  };
}

export function calculateAllMatchPointsForUser(
  predictions: MatchPrediction[],
  matches: Match[],
  settings: PointSettings,
) {
  const matchById = new Map(matches.map((match) => [match.id, match]));
  return predictions.reduce(
    (acc, prediction) => {
      const match = matchById.get(prediction.match_id);
      if (!match) return acc;
      const result = calculateMatchPredictionPoints(prediction, match, settings);
      acc.points += result.points;
      if (result.exact) acc.exactScores += 1;
      return acc;
    },
    { points: 0, exactScores: 0 },
  );
}

export function calculatePredictedGroupStandings(
  teams: Team[],
  matches: Array<
    Pick<
      Match,
      "id" | "home_team_id" | "away_team_id" | "group_letter" | "stage"
    >
  >,
  predictions: MatchPrediction[],
  groupLetter: string,
) {
  const predictionByMatchId = new Map(
    predictions.map((prediction) => [prediction.match_id, prediction]),
  );

  return calculateStandings(
    teams.filter((team) => team.group_letter === groupLetter),
    matches
      .filter(
        (match) => match.stage === "group" && match.group_letter === groupLetter,
      )
      .map((match) => {
        const prediction = predictionByMatchId.get(match.id);
        return {
          home_team_id: match.home_team_id ?? "",
          away_team_id: match.away_team_id ?? "",
          home_score: prediction?.predicted_home_score ?? null,
          away_score: prediction?.predicted_away_score ?? null,
          is_finished: true,
        };
      }),
  );
}

export function calculateRealGroupStandings(
  teams: Team[],
  matches: Match[],
  groupLetter: string,
) {
  return calculateStandings(
    teams.filter((team) => team.group_letter === groupLetter),
    matches.filter(
      (match) =>
        match.stage === "group" &&
        match.group_letter === groupLetter &&
        match.is_finished,
    ),
  );
}

export function calculateBestThirdPlacedTeams(groups: StandingRow[][]) {
  return groups
    .map((group) => group[2])
    .filter(Boolean)
    .sort(compareStandingRows)
    .slice(0, 8);
}

export function calculateGroupPredictionPoints(
  predictedGroups: StandingRow[][],
  realGroups: StandingRow[][],
  settings: PointSettings,
  completedGroups?: boolean[],
) {
  let points = 0;
  const allGroupsCompleted = completedGroups
    ? completedGroups.every(Boolean)
    : true;

  const realBestThirds = allGroupsCompleted
    ? new Set(calculateBestThirdPlacedTeams(realGroups).map((row) => row.team.id))
    : new Set<string>();
  const predictedBestThirds = allGroupsCompleted
    ? new Set(
        calculateBestThirdPlacedTeams(predictedGroups).map((row) => row.team.id),
      )
    : new Set<string>();

  realGroups.forEach((realGroup, index) => {
    if (completedGroups && !completedGroups[index]) return;

    const predictedGroup = predictedGroups[index] ?? [];
    realGroup.forEach((realRow, position) => {
      const predictedRow = predictedGroup[position];
      if (predictedRow?.team.id === realRow.team.id) {
        points += settings.group_exact_position_points;
      }
    });

    if (predictedGroup[0]?.team.id === realGroup[0]?.team.id) {
      points += settings.group_winner_bonus_points;
    }

    const realQualified = new Set(realGroup.slice(0, 2).map((row) => row.team.id));
    predictedGroup.slice(0, 2).forEach((row) => {
      if (realQualified.has(row.team.id)) {
        points += settings.group_qualified_team_points;
      }
    });
  });

  if (allGroupsCompleted) {
    predictedBestThirds.forEach((teamId) => {
      if (realBestThirds.has(teamId)) points += settings.best_third_team_points;
    });
  }

  return points;
}

export function calculateKnockoutPredictionPoints(
  predictions: Array<{ round: string; team_id: string }>,
  reached: Array<{ round: string; team_id: string }>,
  settings: PointSettings,
) {
  const values: Record<string, number> = {
    round_32: settings.knockout_round_32_reached_points,
    round_16: settings.knockout_round_16_reached_points,
    quarter_final: settings.knockout_quarter_reached_points,
    semi_final: settings.knockout_semi_reached_points,
    final: settings.knockout_final_reached_points,
    champion: settings.knockout_champion_points,
  };
  const reachedKeys = new Set(reached.map((item) => `${item.round}:${item.team_id}`));
  return predictions.reduce(
    (total, prediction) =>
      total +
      (reachedKeys.has(`${prediction.round}:${prediction.team_id}`)
        ? values[prediction.round] ?? 0
        : 0),
    0,
  );
}

export function calculateLiveKnockoutMatchPoints(
  prediction: MatchPrediction,
  match: Match,
  settings: PointSettings,
) {
  if (!match.is_finished) return 0;
  const roundValues: Record<string, { winner: number; exact: number }> = {
    round_32: {
      winner: settings.live_round_32_winner_points,
      exact: settings.live_round_32_exact_score_bonus,
    },
    round_16: {
      winner: settings.live_round_16_winner_points,
      exact: settings.live_round_16_exact_score_bonus,
    },
    quarter_final: {
      winner: settings.live_quarter_winner_points,
      exact: settings.live_quarter_exact_score_bonus,
    },
    semi_final: {
      winner: settings.live_semi_winner_points,
      exact: settings.live_semi_exact_score_bonus,
    },
    final: {
      winner: settings.live_final_winner_points,
      exact: settings.live_final_exact_score_bonus,
    },
  };
  const values = roundValues[match.stage];
  if (!values) return 0;
  const realWinner =
    match.winner_team_id ??
    ((match.home_score ?? 0) > (match.away_score ?? 0)
      ? match.home_team_id
      : match.away_team_id);
  let total =
    prediction.predicted_winner_team_id === realWinner ? values.winner : 0;
  const exact = calculateMatchPredictionPoints(prediction, match, {
    match_exact_score_points: values.exact,
    match_sign_points: 0,
  });
  if (exact.exact) total += values.exact;
  return total;
}

export function calculateScorerPoints(
  scorerPredictions: Array<{ player_id: string; is_captain: boolean }>,
  scorerTotals: Map<string, number>,
  settings: PointSettings,
) {
  const total = scorerPredictions.reduce((acc, prediction) => {
    const goals = scorerTotals.get(prediction.player_id) ?? 0;
    const perGoal =
      settings.scorer_goal_points +
      (prediction.is_captain ? settings.scorer_captain_extra_goal_points : 0);
    return acc + goals * perGoal;
  }, 0);
  return Math.min(total, settings.scorer_max_points);
}

export function calculateAwardPoints(
  prediction:
    | {
        top_scorer_player_id: string | null;
        best_player_id: string | null;
        best_goalkeeper_id: string | null;
        best_young_player_id: string | null;
      }
    | null
    | undefined,
  awards:
    | {
        top_scorer_player_id: string | null;
        best_player_id: string | null;
        best_goalkeeper_id: string | null;
        best_young_player_id: string | null;
      }
    | null
    | undefined,
  settings: PointSettings,
) {
  if (!prediction || !awards) return 0;
  let total = 0;
  if (
    awards.top_scorer_player_id &&
    prediction.top_scorer_player_id === awards.top_scorer_player_id
  ) {
    total += settings.award_top_scorer_points;
  }
  if (
    awards.best_player_id &&
    prediction.best_player_id === awards.best_player_id
  ) {
    total += settings.award_best_player_points;
  }
  if (
    awards.best_goalkeeper_id &&
    prediction.best_goalkeeper_id === awards.best_goalkeeper_id
  ) {
    total += settings.award_best_goalkeeper_points;
  }
  if (
    awards.best_young_player_id &&
    prediction.best_young_player_id === awards.best_young_player_id
  ) {
    total += settings.award_best_young_player_points;
  }
  return total;
}

export function calculateTotalUserScore(parts: {
  matchPoints: number;
  groupPoints: number;
  knockoutPoints: number;
  scorerPoints: number;
  awardPoints: number;
}) {
  return (
    parts.matchPoints +
    parts.groupPoints +
    parts.knockoutPoints +
    parts.scorerPoints +
    parts.awardPoints
  );
}

export function withDefaultSettings(
  settings: Partial<PointSettings> & { league_id: string },
): PointSettings {
  return { ...DEFAULT_POINT_SETTINGS, ...settings } as PointSettings;
}

function calculateStandings(
  groupTeams: Team[],
  playedMatches: Array<{
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    is_finished?: boolean;
  }>,
) {
  return sortStandingRows(
    calculateStandingsTable(groupTeams, playedMatches),
    playedMatches,
  );
}

function calculateStandingsTable(
  groupTeams: Team[],
  playedMatches: Array<{
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    is_finished?: boolean;
  }>,
) {
  const rows = new Map<string, StandingRow>();
  groupTeams.forEach((team) => {
    rows.set(team.id, {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  playedMatches.forEach((match) => {
    if (match.home_score === null || match.away_score === null) return;
    if (!match.home_team_id || !match.away_team_id) return;
    const home = rows.get(match.home_team_id);
    const away = rows.get(match.away_team_id);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (match.home_score > match.away_score) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (match.home_score < match.away_score) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  return Array.from(rows.values());
}

function sortStandingRows(
  rows: StandingRow[],
  playedMatches: Array<{
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    is_finished?: boolean;
  }>,
) {
  const ordered = rows
    .slice()
    .sort((left, right) => right.points - left.points || left.team.name.localeCompare(right.team.name));

  return ordered.flatMap((row, index) => {
    if (index > 0 && ordered[index - 1]?.points === row.points) return [];

    const tiedRows = ordered.filter((candidate) => candidate.points === row.points);
    return tiedRows.length > 1 ? breakTieGroup(tiedRows, playedMatches) : [row];
  });
}

function breakTieGroup(
  tiedRows: StandingRow[],
  playedMatches: Array<{
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    is_finished?: boolean;
  }>,
): StandingRow[] {
  const tiedTeamIds = new Set(tiedRows.map((row) => row.team.id));
  const headToHeadMatches = playedMatches.filter(
    (match) =>
      match.home_team_id &&
      match.away_team_id &&
      tiedTeamIds.has(match.home_team_id) &&
      tiedTeamIds.has(match.away_team_id),
  );
  const headToHeadRows = new Map(
    calculateStandingsTable(
      tiedRows.map((row) => row.team),
      headToHeadMatches,
    ).map((row) => [row.team.id, row]),
  );
  const ordered = tiedRows
    .slice()
    .sort((left, right) => compareHeadToHeadRows(left, right, headToHeadRows));
  const groups = splitStandingGroups(ordered, (left, right) =>
    compareHeadToHeadRows(left, right, headToHeadRows),
  );

  if (groups.length > 1) {
    return groups.flatMap((group) =>
      group.length === tiedRows.length ? sortByOverallFallback(group) : breakTieGroup(group, playedMatches),
    );
  }

  return sortByOverallFallback(tiedRows);
}

function compareHeadToHeadRows(
  left: StandingRow,
  right: StandingRow,
  headToHeadRows: Map<string, StandingRow>,
) {
  const leftRow = headToHeadRows.get(left.team.id);
  const rightRow = headToHeadRows.get(right.team.id);

  if (!leftRow || !rightRow) return 0;

  return (
    rightRow.points - leftRow.points ||
    rightRow.goalDifference - leftRow.goalDifference ||
    rightRow.goalsFor - leftRow.goalsFor
  );
}

function splitStandingGroups(
  rows: StandingRow[],
  compare: (left: StandingRow, right: StandingRow) => number,
) {
  return rows.reduce<StandingRow[][]>((groups, row) => {
    const lastGroup = groups.at(-1);
    if (!lastGroup?.length || compare(lastGroup[0], row) !== 0) {
      groups.push([row]);
      return groups;
    }

    lastGroup.push(row);
    return groups;
  }, []);
}

function sortByOverallFallback(rows: StandingRow[]) {
  return rows.slice().sort(compareStandingRows);
}

function compareStandingRows(a: StandingRow, b: StandingRow) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    (a.team.fair_play_points ?? 0) - (b.team.fair_play_points ?? 0) ||
    (a.team.manual_order ?? 999) - (b.team.manual_order ?? 999) ||
    a.team.name.localeCompare(b.team.name)
  );
}
