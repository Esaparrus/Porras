import { saveFinalAwardsAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { PlayerPicker } from "@/components/player-picker";
import { requireAdmin } from "@/lib/data";

export default async function AdminAwardsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: players }, { data: awards }, { data: teams }] = await Promise.all([
    supabase.from("players").select("*, teams(*)").eq("is_active", true).order("name"),
    supabase.from("final_awards").select("*").eq("league_id", leagueId).maybeSingle(),
    supabase.from("teams").select("*").order("name"),
  ]);

  return (
    <AdminLayout leagueId={leagueId}>
      <form action={saveFinalAwardsAction} className="glass mx-auto max-w-2xl rounded-3xl p-6">
        <input type="hidden" name="league_id" value={leagueId} />
        <h1 className="text-3xl font-black">Premios finales</h1>
        <div className="mt-6 grid gap-4">
          <label>
            <span className="label">Pichichi</span>
            <PlayerPicker name="top_scorer_player_id" players={players ?? []} teams={teams ?? []} defaultValue={awards?.top_scorer_player_id} />
          </label>
          <label>
            <span className="label">Mejor jugador</span>
            <PlayerPicker name="best_player_id" players={players ?? []} teams={teams ?? []} defaultValue={awards?.best_player_id} />
          </label>
          <label>
            <span className="label">Mejor portero</span>
            <PlayerPicker name="best_goalkeeper_id" players={players ?? []} teams={teams ?? []} defaultValue={awards?.best_goalkeeper_id} />
          </label>
          <label>
            <span className="label">Mejor joven</span>
            <PlayerPicker name="best_young_player_id" players={players ?? []} teams={teams ?? []} defaultValue={awards?.best_young_player_id} />
          </label>
          <button className="btn-primary">Guardar premios finales</button>
        </div>
      </form>
    </AdminLayout>
  );
}
