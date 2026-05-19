import Link from "next/link";
import { quickGoalAction, recalculateLeagueScoresAction, updateMatchResultAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { ScorerQuickCounter, TeamBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/data";

export default async function DailyPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: matches }, { data: picked }, { data: goalRows }] = await Promise.all([
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .eq("is_finished", false)
      .limit(8),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Vista diaria</h1>
        <form action={recalculateLeagueScoresAction}>
          <input type="hidden" name="league_id" value={leagueId} />
          <button className="btn-primary">Recalcular ranking</button>
        </form>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-black">Partidos pendientes</h2>
          <div className="mt-4 space-y-3">
            {(matches ?? []).map((match) => (
              <form
                key={match.id}
                action={updateMatchResultAction}
                className="glass rounded-2xl p-4"
              >
                <input type="hidden" name="league_id" value={leagueId} />
                <input type="hidden" name="match_id" value={match.id} />
                <div className="font-bold">
                  <TeamBadge team={match.home_team} /> vs <TeamBadge team={match.away_team} />
                </div>
                <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input name="home_score" type="number" min="0" className="field text-center" />
                  <input name="away_score" type="number" min="0" className="field text-center" />
                  <label className="flex items-center gap-2 rounded-2xl bg-white/10 px-3">
                    <input type="checkbox" name="is_finished" defaultChecked />
                    Fin
                  </label>
                </div>
                <button className="btn-primary mt-3 w-full py-2">Guardar</button>
              </form>
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Goleadores importantes</h2>
            <Link href={`/admin/leagues/${leagueId}/scorers`} className="btn-secondary py-2">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 space-y-3">
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
        </section>
      </div>
    </AdminLayout>
  );
}
