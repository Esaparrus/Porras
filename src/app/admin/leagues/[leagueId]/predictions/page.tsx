import { AdminLayout } from "@/components/layouts";
import { MatchCard, PlayerBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/data";

export default async function AdminPredictionsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, profiles(*), match_predictions(*, matches(*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))), scorer_predictions(*, players(*, teams(*))), award_predictions(*)")
    .eq("league_id", leagueId);

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Apuestas</h1>
      <div className="mt-6 grid gap-5">
        {(members ?? []).map((member) => {
          const profile = Array.isArray(member.profiles)
            ? member.profiles[0]
            : member.profiles;
          return (
            <section key={member.user_id} className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black">
                {profile?.display_name ?? "Jugador"}
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
                <div className="space-y-3">
                  {(member.match_predictions ?? []).slice(0, 6).map((prediction) => (
                    <div key={prediction.id} className="rounded-2xl bg-white/5 p-3">
                      <MatchCard match={prediction.matches} />
                      <p className="mt-2 text-center text-sm font-bold text-[#d6b25e]">
                        {prediction.predicted_home_score} - {prediction.predicted_away_score}
                      </p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-black">Goleadores</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(member.scorer_predictions ?? []).map((prediction) => (
                      <PlayerBadge key={prediction.id} player={prediction.players} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </AdminLayout>
  );
}
