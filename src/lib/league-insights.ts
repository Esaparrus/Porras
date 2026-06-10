import type {
  League,
  LeaguePaymentStatus,
  Match,
  PointSettings,
  Team,
} from "@/lib/types";

export type LeaguePointProgress = {
  playedPoints: number;
  remainingPoints: number;
  totalPoints: number;
  progressPercentage: number;
};

export function calculateLeaguePot(
  league: Pick<League, "entry_price" | "pot_total_override">,
  memberCount: number,
) {
  const override = Math.max(0, league.pot_total_override ?? 0);
  if (override > 0) return override;
  return Math.max(0, league.entry_price ?? 0) * Math.max(0, memberCount);
}

export function calculatePrizeBreakdown(
  league: Pick<
    League,
    "prize_first_percentage" | "prize_second_percentage" | "prize_third_percentage"
  >,
  totalPot: number,
) {
  const first = calculatePrizeSlice(totalPot, league.prize_first_percentage);
  const second = calculatePrizeSlice(totalPot, league.prize_second_percentage);
  const third = calculatePrizeSlice(totalPot, league.prize_third_percentage);

  return {
    first,
    second,
    third,
    remainder: Math.max(0, totalPot - first - second - third),
  };
}

export function getPrizeForPosition(
  position: number,
  prizes: ReturnType<typeof calculatePrizeBreakdown>,
) {
  if (position === 1) return prizes.first;
  if (position === 2) return prizes.second;
  if (position === 3) return prizes.third;
  return 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getPaymentStatusCopy(status: LeaguePaymentStatus) {
  return status === "paid"
    ? {
        short: "Pagado",
        playful: "Pagado",
      }
    : {
        short: "RATA",
        playful: "RATA",
      };
}

export function calculateLeaguePointProgress({
  matches,
  teams,
  settings,
  finalAwards,
}: {
  matches: Match[];
  teams: Team[];
  settings: PointSettings;
  finalAwards?:
    | {
        top_scorer_player_id: string | null;
        best_player_id: string | null;
        best_goalkeeper_id: string | null;
        best_young_player_id: string | null;
      }
    | null;
}) {
  const groupMatches = matches.filter((match) => match.stage === "group");
  const knockoutMatches = matches.filter((match) => LIVE_KNOCKOUT_STAGES.has(match.stage));
  const groupLetters = Array.from(
    new Set(teams.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const totalGoalsScored = matches.reduce((total, match) => {
    if (!match.is_finished || match.home_score === null || match.away_score === null) {
      return total;
    }
    return total + match.home_score + match.away_score;
  }, 0);

  let playedPoints = 0;
  let remainingPoints = 0;

  groupMatches.forEach((match) => {
    const maxMatchPoints =
      settings.match_sign_points +
      settings.match_goal_difference_points +
      settings.match_exact_score_points;
    if (match.is_finished) {
      playedPoints += maxMatchPoints;
    } else {
      remainingPoints += maxMatchPoints;
    }
  });

  knockoutMatches.forEach((match) => {
    const values = knockoutValueByStage(match.stage, settings);
    const maxMatchPoints =
      values.sign + values.winner + values.goalDifference + values.exact;
    if (match.is_finished) {
      playedPoints += maxMatchPoints;
    } else {
      remainingPoints += maxMatchPoints;
    }
  });

  const finalMatch = matches.find((match) => match.stage === "final");
  const finalPlacementBundle =
    settings.knockout_champion_points + settings.knockout_runner_up_points;
  if (finalMatch?.is_finished) {
    playedPoints += finalPlacementBundle;
  } else {
    remainingPoints += finalPlacementBundle;
  }

  const thirdPlaceMatch = matches.find((match) => match.stage === "third_place");
  if (thirdPlaceMatch?.is_finished) {
    playedPoints += settings.knockout_third_place_points;
  } else {
    remainingPoints += settings.knockout_third_place_points;
  }

  // Puntos por "llega a ronda": una seleccion entra en la ronda R cuando termina
  // la ronda anterior, asi que esos puntos se consideran jugados en ese momento.
  // (Llegar a dieciseisavos = clasificar de grupos, ya contado en los bundles de grupo.)
  const reachedRounds: Array<{
    stage: Match["stage"];
    previous: Match["stage"];
    points: number;
  }> = [
    { stage: "round_16", previous: "round_32", points: settings.knockout_round_16_reached_points },
    { stage: "quarter_final", previous: "round_16", points: settings.knockout_quarter_reached_points },
    { stage: "semi_final", previous: "quarter_final", points: settings.knockout_semi_reached_points },
    { stage: "final", previous: "semi_final", points: settings.knockout_final_reached_points },
  ];
  reachedRounds.forEach(({ stage, previous, points }) => {
    const entrants = knockoutMatches.filter((match) => match.stage === stage).length * 2;
    if (entrants === 0) return;
    const previousMatches = knockoutMatches.filter((match) => match.stage === previous);
    const previousFinished =
      previousMatches.length > 0 && previousMatches.every((match) => match.is_finished);
    const bundle = entrants * points;
    if (previousFinished) {
      playedPoints += bundle;
    } else {
      remainingPoints += bundle;
    }
  });

  groupLetters.forEach((groupLetter) => {
    const groupFinished = groupMatches
      .filter((match) => match.group_letter === groupLetter)
      .every((match) => match.is_finished);
    const groupBundle =
      settings.group_exact_position_points * 4 +
      settings.group_winner_bonus_points +
      settings.group_qualified_team_points * 2;

    if (groupFinished) {
      playedPoints += groupBundle;
    } else {
      remainingPoints += groupBundle;
    }
  });

  const bestThirdBundle = settings.best_third_team_points * Math.min(8, groupLetters.length);
  if (groupMatches.length > 0 && groupMatches.every((match) => match.is_finished)) {
    playedPoints += bestThirdBundle;
  } else {
    remainingPoints += bestThirdBundle;
  }

  const scorerPlayed = Math.min(
    settings.scorer_max_points,
    totalGoalsScored * settings.scorer_goal_points,
  );
  playedPoints += scorerPlayed;
  remainingPoints += Math.max(0, settings.scorer_max_points - scorerPlayed);

  awardKeys.forEach(([key, settingKey]) => {
    if (finalAwards?.[key]) {
      playedPoints += settings[settingKey];
    } else {
      remainingPoints += settings[settingKey];
    }
  });

  const totalPoints = playedPoints + remainingPoints;

  return {
    playedPoints,
    remainingPoints,
    totalPoints,
    progressPercentage: totalPoints ? Math.round((playedPoints / totalPoints) * 100) : 0,
  } satisfies LeaguePointProgress;
}

function calculatePrizeSlice(totalPot: number, percentage: number) {
  const safePercentage = Math.max(0, percentage ?? 0);
  return Math.round((Math.max(0, totalPot) * safePercentage) / 100);
}

function knockoutValueByStage(stage: Match["stage"], settings: PointSettings) {
  if (stage === "round_32") {
    return {
      sign: settings.live_round_32_sign_points,
      winner: settings.live_round_32_winner_points,
      goalDifference: settings.live_round_32_goal_difference_points,
      exact: settings.live_round_32_exact_score_bonus,
    };
  }
  if (stage === "round_16") {
    return {
      sign: settings.live_round_16_sign_points,
      winner: settings.live_round_16_winner_points,
      goalDifference: settings.live_round_16_goal_difference_points,
      exact: settings.live_round_16_exact_score_bonus,
    };
  }
  if (stage === "quarter_final") {
    return {
      sign: settings.live_quarter_sign_points,
      winner: settings.live_quarter_winner_points,
      goalDifference: settings.live_quarter_goal_difference_points,
      exact: settings.live_quarter_exact_score_bonus,
    };
  }
  if (stage === "semi_final") {
    return {
      sign: settings.live_semi_sign_points,
      winner: settings.live_semi_winner_points,
      goalDifference: settings.live_semi_goal_difference_points,
      exact: settings.live_semi_exact_score_bonus,
    };
  }
  if (stage === "third_place") {
    return {
      sign: settings.live_third_place_sign_points,
      winner: settings.live_third_place_winner_points,
      goalDifference: settings.live_third_place_goal_difference_points,
      exact: settings.live_third_place_exact_score_bonus,
    };
  }
  return {
    sign: settings.live_final_sign_points,
    winner: settings.live_final_winner_points,
    goalDifference: settings.live_final_goal_difference_points,
    exact: settings.live_final_exact_score_bonus,
  };
}

const LIVE_KNOCKOUT_STAGES = new Set<Match["stage"]>([
  "round_32",
  "round_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
]);

const awardKeys = [
  ["top_scorer_player_id", "award_top_scorer_points"],
  ["best_player_id", "award_best_player_points"],
  ["best_goalkeeper_id", "award_best_goalkeeper_points"],
  ["best_young_player_id", "award_best_young_player_points"],
] as const;
