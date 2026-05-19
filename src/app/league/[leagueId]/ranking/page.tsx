import { UserLayout } from "@/components/layouts";
import { RankingTable } from "@/components/ui";
import { requireUser } from "@/lib/data";

export default async function LeagueRankingPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireUser();
  const { data: scores } = await supabase
    .from("scores")
    .select("*, profiles(*)")
    .eq("league_id", leagueId)
    .order("total_points", { ascending: false })
    .order("exact_scores_count", { ascending: false })
    .order("knockout_points", { ascending: false })
    .order("scorer_points", { ascending: false });

  return (
    <UserLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Clasificación</h1>
      <div className="mt-6 overflow-x-auto">
        <RankingTable scores={scores ?? []} />
      </div>
    </UserLayout>
  );
}
