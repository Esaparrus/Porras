import { UserLayout } from "@/components/layouts";
import { RankingTable } from "@/components/ui";
import {
  calculateLeaguePointProgress,
  calculateLeaguePot,
  calculatePrizeBreakdown,
  getPrizeForPosition,
} from "@/lib/league-insights";
import { requireUser } from "@/lib/data";
import { withDefaultSettings } from "@/lib/scoring";
import type { LeagueMember, Match, PointSettings, Score, Team } from "@/lib/types";

export default async function LeagueRankingPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireUser();
  const [
    { data: scores },
    { data: league },
    { data: members },
    { data: matches },
    { data: teams },
    { data: settings },
    { data: finalAwards },
  ] = await Promise.all([
    supabase
      .from("scores")
      .select("*, profiles(*)")
      .eq("league_id", leagueId)
      .order("total_points", { ascending: false })
      .order("exact_scores_count", { ascending: false })
      .order("knockout_points", { ascending: false })
      .order("scorer_points", { ascending: false }),
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase.from("league_members").select("*").eq("league_id", leagueId),
    supabase.from("matches").select("*"),
    supabase.from("teams").select("*"),
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .maybeSingle(),
    supabase.from("final_awards").select("*").eq("league_id", leagueId).maybeSingle(),
  ]);

  const pointSettings = withDefaultSettings({
    league_id: leagueId,
    ...(settings ?? {}),
  });
  const memberRows = (members ?? []) as LeagueMember[];
  const matchesRows = (matches ?? []) as Match[];
  const teamRows = (teams ?? []) as Team[];
  const scoreRows = (scores ?? []) as Score[];
  const paymentByUserId = new Map(
    memberRows.map((member) => [member.user_id, member.payment_status]),
  );
  const totalPot = league ? calculateLeaguePot(league, memberRows.length) : 0;
  const prizes = league
    ? calculatePrizeBreakdown(league, totalPot)
    : { first: 0, second: 0, third: 0, remainder: 0 };
  const progress = calculateLeaguePointProgress({
    matches: matchesRows,
    teams: teamRows,
    settings: pointSettings as PointSettings,
    finalAwards,
  });

  const rows = scoreRows.map((score, index) => ({
    userId: score.user_id,
    displayName: score.profiles?.display_name ?? "Jugador",
    paymentStatus: paymentByUserId.get(score.user_id) ?? "pending",
    prize: getPrizeForPosition(index + 1, prizes),
    score,
  }));

  return (
    <UserLayout leagueId={leagueId}>
      <RankingTable
        leagueId={leagueId}
        rows={rows}
        summary={{
          memberCount: memberRows.length,
          totalPot,
          entryPrice: league?.entry_price ?? 0,
          playedPoints: progress.playedPoints,
          remainingPoints: progress.remainingPoints,
          progressPercentage: progress.progressPercentage,
          prizes,
        }}
        title="Clasificacion"
        allowPlayerLinks
      />
    </UserLayout>
  );
}
