import {
  BEST_THIRD_SCOPE_KEY,
  buildManualRankMap,
} from "@/lib/prediction-tiebreaks";
import {
  calculateAllMatchPointsForUser,
  calculateAwardPoints,
  calculateBestThirdPlacedTeams,
  calculateGroupPredictionPoints,
  calculateLiveKnockoutMatchPoints,
  calculatePredictedGroupStandings,
  calculateRealGroupStandings,
  calculateScorerPoints,
  calculateTotalUserScore,
  getPredictedMatchLoser,
  getPredictedMatchWinner,
} from "@/lib/scoring";
import type {
  Match,
  MatchPrediction,
  PointSettings,
  PredictionTiebreakSelection,
  Profile,
  Team,
} from "@/lib/types";
import { getMatchLoser, getMatchWinner } from "@/lib/world-cup";

export type RankingEvolutionMember = {
  user_id: string;
  profiles?: Profile | Profile[] | null;
};

type ScorerPrediction = {
  user_id: string;
  player_id: string;
};

type AwardPrediction = {
  user_id: string;
  top_scorer_player_id: string | null;
  best_player_id: string | null;
  best_goalkeeper_id: string | null;
  best_young_player_id: string | null;
};

type FinalAwards = Omit<AwardPrediction, "user_id"> | null | undefined;

type MatchScorerRow = {
  match_id: string;
  player_id: string;
  goals: number;
};

export type RankingEvolutionPlayer = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarEmoji: string | null;
};

export type RankingEvolutionEntry = {
  userId: string;
  rank: number;
  totalPoints: number;
  matchPoints: number;
  groupPoints: number;
  knockoutPoints: number;
  scorerPoints: number;
  awardPoints: number;
  exactScores: number;
};

export type RankingEvolutionFrame = {
  key: string;
  label: string;
  matchNumber: number | null;
  matchDate: string | null;
  finishedMatches: number;
  entries: RankingEvolutionEntry[];
};

export type RankingEvolutionData = {
  players: RankingEvolutionPlayer[];
  frames: RankingEvolutionFrame[];
  totalMatches: number;
};

export function buildRankingEvolution({
  members,
  matches,
  teams,
  settings,
  matchPredictions,
  scorerPredictions,
  awardPredictions,
  tiebreakSelections,
  matchScorers,
  finalAwards,
}: {
  members: RankingEvolutionMember[];
  matches: Match[];
  teams: Team[];
  settings: PointSettings;
  matchPredictions: MatchPrediction[];
  scorerPredictions: ScorerPrediction[];
  awardPredictions: AwardPrediction[];
  tiebreakSelections: PredictionTiebreakSelection[];
  matchScorers: MatchScorerRow[];
  finalAwards: FinalAwards;
}): RankingEvolutionData {
  const groupLetters = Array.from(
    new Set(teams.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const orderedMatches = matches.slice().sort(compareMatches);
  const finishedMatches = orderedMatches.filter(isScoredFinishedMatch);
  const players = members.map((member) => {
    const profile = Array.isArray(member.profiles)
      ? member.profiles[0]
      : member.profiles;

    return {
      userId: member.user_id,
      displayName: profile?.display_name || profile?.username || "Jugador",
      username: profile?.username ?? null,
      avatarEmoji: profile?.avatar_emoji ?? null,
    };
  });
  const playerByUserId = new Map(players.map((player) => [player.userId, player]));
  const predictionsByUser = groupByUser(matchPredictions);
  const scorersByUser = groupByUser(scorerPredictions);
  const awardsByUser = new Map(awardPredictions.map((row) => [row.user_id, row]));
  const tiebreaksByUser = groupByUser(tiebreakSelections);
  const baseFrame = scoreFrame({
    key: "start",
    label: "Inicio",
    matchNumber: null,
    matchDate: null,
    snapshotMatches: [],
    allMatches: orderedMatches,
    teams,
    settings,
    groupLetters,
    players,
    playerByUserId,
    predictionsByUser,
    scorersByUser,
    awardsByUser,
    tiebreaksByUser,
    matchScorers,
    finalAwards,
  });
  const frames = [
    baseFrame,
    ...finishedMatches.map((match, index) =>
      scoreFrame({
        key: match.id,
        label: formatFrameLabel(match, index + 1),
        matchNumber: match.match_number,
        matchDate: match.match_date,
        snapshotMatches: finishedMatches.slice(0, index + 1),
        allMatches: orderedMatches,
        teams,
        settings,
        groupLetters,
        players,
        playerByUserId,
        predictionsByUser,
        scorersByUser,
        awardsByUser,
        tiebreaksByUser,
        matchScorers,
        finalAwards,
      }),
    ),
  ];

  return {
    players,
    frames,
    totalMatches: matches.length,
  };
}

function scoreFrame({
  key,
  label,
  matchNumber,
  matchDate,
  snapshotMatches,
  allMatches,
  teams,
  settings,
  groupLetters,
  players,
  playerByUserId,
  predictionsByUser,
  scorersByUser,
  awardsByUser,
  tiebreaksByUser,
  matchScorers,
  finalAwards,
}: {
  key: string;
  label: string;
  matchNumber: number | null;
  matchDate: string | null;
  snapshotMatches: Match[];
  allMatches: Match[];
  teams: Team[];
  settings: PointSettings;
  groupLetters: string[];
  players: RankingEvolutionPlayer[];
  playerByUserId: Map<string, RankingEvolutionPlayer>;
  predictionsByUser: Map<string, MatchPrediction[]>;
  scorersByUser: Map<string, ScorerPrediction[]>;
  awardsByUser: Map<string, AwardPrediction>;
  tiebreaksByUser: Map<string, PredictionTiebreakSelection[]>;
  matchScorers: MatchScorerRow[];
  finalAwards: FinalAwards;
}): RankingEvolutionFrame {
  const snapshotMatchIds = new Set(snapshotMatches.map((match) => match.id));
  const completedGroups = groupLetters.map((group) => {
    const groupMatches = allMatches.filter(
      (match) => match.stage === "group" && match.group_letter === group,
    );
    return (
      groupMatches.length > 0 &&
      groupMatches.every((match) => snapshotMatchIds.has(match.id))
    );
  });
  const realGroups = groupLetters.map((group) =>
    calculateRealGroupStandings(teams, snapshotMatches, group),
  );
  const scorerTotals = new Map<string, number>();
  matchScorers.forEach((row) => {
    if (!snapshotMatchIds.has(row.match_id)) return;
    scorerTotals.set(row.player_id, (scorerTotals.get(row.player_id) ?? 0) + row.goals);
  });
  const finalMatch = snapshotMatches.find((match) => match.stage === "final");
  const thirdPlaceMatch = snapshotMatches.find((match) => match.stage === "third_place");
  const awardsUnlocked = Boolean(finalMatch && finalAwards);

  const entries = players
    .map((player) => {
      const userId = player.userId;
      const matchPredictionsForUser = predictionsByUser.get(userId) ?? [];
      const tiebreakSelections = tiebreaksByUser.get(userId) ?? [];
      const groupTiebreaks = new Map(
        groupLetters.map((group) => [
          group,
          buildManualRankMap(
            tiebreakSelections
              .filter(
                (selection) =>
                  selection.scope_type === "group" && selection.scope_key === group,
              )
              .sort((left, right) => left.rank - right.rank)
              .map((selection) => selection.team_id),
          ),
        ]),
      );
      const bestThirdManualRanks = buildManualRankMap(
        tiebreakSelections
          .filter(
            (selection) =>
              selection.scope_type === "best_third" &&
              selection.scope_key === BEST_THIRD_SCOPE_KEY,
          )
          .sort((left, right) => left.rank - right.rank)
          .map((selection) => selection.team_id),
      );
      const groupPredictions = matchPredictionsForUser.filter((prediction) => {
        const match = allMatches.find((item) => item.id === prediction.match_id);
        return match?.stage === "group";
      });
      const knockoutPredictions = matchPredictionsForUser.filter((prediction) => {
        const match = allMatches.find((item) => item.id === prediction.match_id);
        return match && match.stage !== "group";
      });
      const matchPoints = calculateAllMatchPointsForUser(
        groupPredictions,
        snapshotMatches,
        settings,
      );
      const predictedGroups = groupLetters.map((group) =>
        calculatePredictedGroupStandings(teams, allMatches, groupPredictions, group, {
          manualRanksByTeamId: groupTiebreaks.get(group),
        }),
      );
      const predictedBestThirdIds = new Set(
        calculateBestThirdPlacedTeams(predictedGroups, {
          manualRanksByTeamId: bestThirdManualRanks,
        }).map((row) => row.team.id),
      );
      const groupPoints = calculateGroupPredictionPoints(
        predictedGroups,
        realGroups,
        settings,
        completedGroups,
        predictedBestThirdIds,
      );
      const knockoutPoints = knockoutPredictions.reduce((total, prediction) => {
        const match = snapshotMatches.find((item) => item.id === prediction.match_id);
        return match
          ? total + calculateLiveKnockoutMatchPoints(prediction, match, settings)
          : total;
      }, 0);
      const finalPrediction = finalMatch
        ? matchPredictionsForUser.find((prediction) => prediction.match_id === finalMatch.id)
        : null;
      const thirdPlacePrediction = thirdPlaceMatch
        ? matchPredictionsForUser.find((prediction) => prediction.match_id === thirdPlaceMatch.id)
        : null;
      const championHit = Boolean(
        finalMatch &&
          finalPrediction &&
          getPredictedMatchWinner(finalPrediction, finalMatch) === getMatchWinner(finalMatch),
      );
      const runnerUpHit = Boolean(
        finalMatch &&
          finalPrediction &&
          getPredictedMatchLoser(finalPrediction, finalMatch) === getMatchLoser(finalMatch),
      );
      const thirdPlaceHit = Boolean(
        thirdPlaceMatch &&
          thirdPlacePrediction &&
          getPredictedMatchWinner(thirdPlacePrediction, thirdPlaceMatch) ===
            getMatchWinner(thirdPlaceMatch),
      );
      const championPoints = championHit ? settings.knockout_champion_points : 0;
      const runnerUpPoints = runnerUpHit ? settings.knockout_runner_up_points : 0;
      const thirdPlacePoints = thirdPlaceHit ? settings.knockout_third_place_points : 0;
      const placementPoints = championPoints + runnerUpPoints + thirdPlacePoints;
      const scorerPoints = calculateScorerPoints(
        scorersByUser.get(userId) ?? [],
        scorerTotals,
        settings,
      );
      const awardPoints = awardsUnlocked
        ? calculateAwardPoints(awardsByUser.get(userId), finalAwards, settings)
        : 0;
      const totalPoints = calculateTotalUserScore({
        matchPoints: matchPoints.points,
        groupPoints,
        knockoutPoints: knockoutPoints + placementPoints,
        scorerPoints,
        awardPoints,
      });

      return {
        userId,
        rank: 0,
        totalPoints,
        matchPoints: matchPoints.points,
        groupPoints,
        knockoutPoints: knockoutPoints + placementPoints,
        scorerPoints,
        awardPoints,
        exactScores: matchPoints.exactScores,
      };
    })
    .sort((left, right) => compareEntries(left, right, playerByUserId));

  return {
    key,
    label,
    matchNumber,
    matchDate,
    finishedMatches: snapshotMatches.length,
    entries: entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
  };
}

function compareEntries(
  left: Omit<RankingEvolutionEntry, "rank">,
  right: Omit<RankingEvolutionEntry, "rank">,
  playerByUserId: Map<string, RankingEvolutionPlayer>,
) {
  const leftPlayer = playerByUserId.get(left.userId);
  const rightPlayer = playerByUserId.get(right.userId);
  return (
    right.totalPoints - left.totalPoints ||
    right.exactScores - left.exactScores ||
    right.knockoutPoints - left.knockoutPoints ||
    right.scorerPoints - left.scorerPoints ||
    (leftPlayer?.displayName ?? "").localeCompare(rightPlayer?.displayName ?? "")
  );
}

function compareMatches(left: Match, right: Match) {
  const leftTime = left.match_date ? new Date(left.match_date).getTime() : 0;
  const rightTime = right.match_date ? new Date(right.match_date).getTime() : 0;
  return leftTime - rightTime || (left.match_number ?? 999) - (right.match_number ?? 999);
}

function formatFrameLabel(match: Match, index: number) {
  if (match.match_date) {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      timeZone: "Europe/Madrid",
    }).format(new Date(match.match_date));
  }

  return match.match_number ? `Partido ${match.match_number}` : `Corte ${index}`;
}

function groupByUser<Row extends { user_id: string }>(rows: Row[]) {
  return rows.reduce<Map<string, Row[]>>((groups, row) => {
    const current = groups.get(row.user_id);
    if (current) {
      current.push(row);
    } else {
      groups.set(row.user_id, [row]);
    }
    return groups;
  }, new Map());
}

function isScoredFinishedMatch(match: Match) {
  return match.is_finished && match.home_score !== null && match.away_score !== null;
}
