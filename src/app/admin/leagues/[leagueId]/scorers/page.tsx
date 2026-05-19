import { quickGoalAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { ScorerQuickCounter } from "@/components/ui";
import { requireAdmin } from "@/lib/data";

export default async function AdminScorersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: picked }, { data: goalRows }] = await Promise.all([
    supabase
      .from("scorer_predictions")
      .select("player_id, players(*, teams(*))")
      .eq("league_id", leagueId),
    supabase.from("league_player_goals").select("*").eq("league_id", leagueId),
  ]);
  const goals = new Map((goalRows ?? []).map((row) => [row.player_id, row.goals]));
  type PickedPlayer = { name?: string; teams?: { flag_emoji?: string } | null };
  const pickedMap = new Map<string, { count: number; player: PickedPlayer | null }>();
  (picked ?? []).forEach((row: { player_id: string; players: PickedPlayer | PickedPlayer[] | null }) => {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    const current = pickedMap.get(row.player_id) ?? { count: 0, player };
    current.count += 1;
    pickedMap.set(row.player_id, current);
  });

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Goleadores rápidos</h1>
      <p className="mt-2 text-slate-300">
        Solo aparecen jugadores elegidos por usuarios de esta liga.
      </p>
      <div className="mt-6 grid gap-3">
        {Array.from(pickedMap.entries()).map(([playerId, item]) => (
          <ScorerQuickCounter
            key={playerId}
            leagueId={leagueId}
            playerId={playerId}
            name={item.player?.name ?? "Jugador"}
            flag={item.player?.teams?.flag_emoji}
            pickedCount={item.count}
            goals={goals.get(playerId) ?? 0}
            action={quickGoalAction}
          />
        ))}
      </div>
    </AdminLayout>
  );
}
