import { updateMatchResultAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { TeamBadge } from "@/components/ui";
import { STAGE_LABELS } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";

export default async function AdminMatchesPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const { data: matches } = await supabase
    .from("matches")
    .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
    .order("stage")
    .order("group_letter");

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Partidos y resultados</h1>
      <div className="mt-6 grid gap-4">
        {(matches ?? []).map((match) => (
          <form
            key={match.id}
            action={updateMatchResultAction}
            className="glass grid gap-3 rounded-2xl p-4 lg:grid-cols-[1fr_90px_90px_auto]"
          >
            <input type="hidden" name="league_id" value={leagueId} />
            <input type="hidden" name="match_id" value={match.id} />
            <div>
              <span className="badge mb-2">
                {match.group_letter ? `Grupo ${match.group_letter}` : STAGE_LABELS[match.stage]}
              </span>
              <div className="font-bold">
                <TeamBadge team={match.home_team} /> vs <TeamBadge team={match.away_team} />
              </div>
            </div>
            <input
              name="home_score"
              type="number"
              min="0"
              defaultValue={match.home_score ?? ""}
              className="field text-center"
            />
            <input
              name="away_score"
              type="number"
              min="0"
              defaultValue={match.away_score ?? ""}
              className="field text-center"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_finished"
                  defaultChecked={match.is_finished}
                />
                Finalizado
              </label>
              <button className="btn-primary py-2">Guardar</button>
            </div>
          </form>
        ))}
      </div>
    </AdminLayout>
  );
}
