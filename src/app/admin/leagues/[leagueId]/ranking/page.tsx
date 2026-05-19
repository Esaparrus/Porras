import { recalculateLeagueScoresAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { RankingTable } from "@/components/ui";
import { requireAdmin } from "@/lib/data";

export default async function AdminRankingPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const { data: scores } = await supabase
    .from("scores")
    .select("*, profiles(*)")
    .eq("league_id", leagueId)
    .order("total_points", { ascending: false })
    .order("exact_scores_count", { ascending: false })
    .order("knockout_points", { ascending: false })
    .order("scorer_points", { ascending: false });

  return (
    <AdminLayout leagueId={leagueId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Ranking</h1>
        <form action={recalculateLeagueScoresAction}>
          <input type="hidden" name="league_id" value={leagueId} />
          <button className="btn-primary">Recalcular ranking</button>
        </form>
      </div>
      <div className="mt-6 overflow-x-auto">
        <RankingTable scores={scores ?? []} />
      </div>
    </AdminLayout>
  );
}
