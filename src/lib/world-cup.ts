import { calculateBestThirdPlacedTeams, calculateRealGroupStandings } from "@/lib/scoring";
import type { Match, Team } from "@/lib/types";

type SupabaseAdmin = ReturnType<typeof import("@/lib/supabase/admin").createSupabaseAdminClient>;

const GROUPS = "ABCDEFGHIJKL".split("");

const ROUND_32_SLOTS: Record<number, [string, string]> = {
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

const WINNER_SLOTS: Record<number, [number, number]> = {
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

const LOSER_SLOTS: Record<number, [number, number]> = {
  103: [101, 102],
};

export const KNOCKOUT_STAGES = [
  "round_32",
  "round_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
] as const;

export function getMatchWinner(match: Pick<Match, "home_team_id" | "away_team_id" | "home_score" | "away_score" | "winner_team_id" | "is_finished">) {
  if (!match.is_finished) return null;
  if (match.winner_team_id) return match.winner_team_id;
  if (match.home_score === null || match.away_score === null) return null;
  if (match.home_score > match.away_score) return match.home_team_id;
  if (match.away_score > match.home_score) return match.away_team_id;
  return null;
}

export function getMatchLoser(match: Match) {
  const winner = getMatchWinner(match);
  if (!winner) return null;
  if (match.home_team_id === winner) return match.away_team_id;
  if (match.away_team_id === winner) return match.home_team_id;
  return null;
}

export function getCurrentAdminStage(matches: Match[]) {
  const groupMatches = matches.filter((match) => match.stage === "group");
  if (groupMatches.some((match) => !match.is_finished)) return "group";

  for (const stage of KNOCKOUT_STAGES) {
    const stageMatches = matches.filter((match) => match.stage === stage);
    if (stageMatches.length && stageMatches.some((match) => !match.is_finished)) {
      return stage;
    }
  }

  return "awards";
}

export async function generateKnockoutFromResults(supabase: SupabaseAdmin) {
  const [{ data: matchData }, { data: teamData }] = await Promise.all([
    supabase.from("matches").select("*"),
    supabase.from("teams").select("*"),
  ]);

  const matches = (matchData ?? []) as Match[];
  const teams = (teamData ?? []) as Team[];
  const matchByNumber = new Map(matches.map((match) => [match.match_number, match]));
  const groupMatches = matches.filter((match) => match.stage === "group");

  if (groupMatches.length === 72 && groupMatches.every((match) => match.is_finished)) {
    await fillRoundOf32(supabase, teams, matches);
  }

  await fillWinnerRounds(supabase, matchByNumber);
}

async function fillRoundOf32(supabase: SupabaseAdmin, teams: Team[], matches: Match[]) {
  const standingsByGroup = new Map(
    GROUPS.map((group) => [group, calculateRealGroupStandings(teams, matches, group)]),
  );
  const thirdRows = calculateBestThirdPlacedTeams(
    GROUPS.map((group) => standingsByGroup.get(group) ?? []),
  );
  const usedThirds = new Set<string>();

  for (const [matchNumberText, [homeSlot, awaySlot]] of Object.entries(ROUND_32_SLOTS)) {
    const homeTeamId = resolveGroupSlot(homeSlot, standingsByGroup, thirdRows, usedThirds);
    const awayTeamId = resolveGroupSlot(awaySlot, standingsByGroup, thirdRows, usedThirds);
    if (!homeTeamId || !awayTeamId) continue;

    await supabase
      .from("matches")
      .update({ home_team_id: homeTeamId, away_team_id: awayTeamId })
      .eq("match_number", Number(matchNumberText));
  }
}

function resolveGroupSlot(
  slot: string,
  standingsByGroup: Map<string, ReturnType<typeof calculateRealGroupStandings>>,
  thirdRows: ReturnType<typeof calculateBestThirdPlacedTeams>,
  usedThirds: Set<string>,
) {
  const position = Number(slot[0]);
  if (position === 1 || position === 2) {
    return standingsByGroup.get(slot[1])?.[position - 1]?.team.id ?? null;
  }

  const allowedGroups = new Set(slot.slice(1).split(""));
  const row = thirdRows.find(
    (third) =>
      third.team.group_letter &&
      allowedGroups.has(third.team.group_letter) &&
      !usedThirds.has(third.team.id),
  );
  if (!row) return null;
  usedThirds.add(row.team.id);
  return row.team.id;
}

async function fillWinnerRounds(supabase: SupabaseAdmin, matchByNumber: Map<number | null, Match>) {
  for (const [targetText, [leftNumber, rightNumber]] of Object.entries(WINNER_SLOTS)) {
    const left = matchByNumber.get(leftNumber);
    const right = matchByNumber.get(rightNumber);
    const homeTeamId = left ? getMatchWinner(left) : null;
    const awayTeamId = right ? getMatchWinner(right) : null;
    if (!homeTeamId || !awayTeamId) continue;
    await supabase
      .from("matches")
      .update({ home_team_id: homeTeamId, away_team_id: awayTeamId })
      .eq("match_number", Number(targetText));
  }

  for (const [targetText, [leftNumber, rightNumber]] of Object.entries(LOSER_SLOTS)) {
    const left = matchByNumber.get(leftNumber);
    const right = matchByNumber.get(rightNumber);
    const homeTeamId = left ? getMatchLoser(left) : null;
    const awayTeamId = right ? getMatchLoser(right) : null;
    if (!homeTeamId || !awayTeamId) continue;
    await supabase
      .from("matches")
      .update({ home_team_id: homeTeamId, away_team_id: awayTeamId })
      .eq("match_number", Number(targetText));
  }
}
