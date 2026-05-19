import { saveFinalAwardsAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { PlayerSearchCombobox } from "@/components/ui";
import { requireAdmin } from "@/lib/data";

export default async function AdminAwardsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: players }, { data: awards }] = await Promise.all([
    supabase.from("players").select("*, teams(*)").eq("is_active", true).order("name"),
    supabase.from("final_awards").select("*").eq("league_id", leagueId).maybeSingle(),
  ]);

  return (
    <AdminLayout leagueId={leagueId}>
      <form action={saveFinalAwardsAction} className="glass mx-auto max-w-2xl rounded-3xl p-6">
        <input type="hidden" name="league_id" value={leagueId} />
        <h1 className="text-3xl font-black">Premios finales</h1>
        <div className="mt-6 grid gap-4">
          <label>
            <span className="label">Pichichi</span>
            <PlayerSearchCombobox name="top_scorer_player_id" players={players ?? []} defaultValue={awards?.top_scorer_player_id} />
          </label>
          <label>
            <span className="label">Mejor jugador</span>
            <PlayerSearchCombobox name="best_player_id" players={players ?? []} defaultValue={awards?.best_player_id} />
          </label>
          <label>
            <span className="label">Mejor portero</span>
            <PlayerSearchCombobox name="best_goalkeeper_id" players={players ?? []} defaultValue={awards?.best_goalkeeper_id} />
          </label>
          <label>
            <span className="label">Mejor joven</span>
            <PlayerSearchCombobox name="best_young_player_id" players={players ?? []} defaultValue={awards?.best_young_player_id} />
          </label>
          <button className="btn-primary">Guardar premios finales</button>
        </div>
      </form>
    </AdminLayout>
  );
}
