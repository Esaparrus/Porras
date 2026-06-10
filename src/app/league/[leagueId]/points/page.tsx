import { UserLayout } from "@/components/layouts";
import { PointRulesCard, PointsPhilosophyCard, ScoreBreakdownCard } from "@/components/ui";
import { requireUser } from "@/lib/data";
import { withDefaultSettings } from "@/lib/scoring";
import type { PointSettings } from "@/lib/types";

export default async function LeaguePointsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: settings }, { data: score }] = await Promise.all([
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const pointSettings = withDefaultSettings({
    league_id: leagueId,
    ...(settings ?? {}),
  }) as PointSettings;

  return (
    <UserLayout leagueId={leagueId}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Puntuaciones</h1>
            <p className="mt-2 text-slate-300">
              Aquí tienes las reglas de puntuación de la liga y tu desglose actual.
            </p>
          </div>
          <span className="badge">Reglas</span>
        </div>

        <PointsPhilosophyCard settings={pointSettings} />

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <PointRulesCard settings={pointSettings} />
          <div className="glass rounded-3xl p-5">
            <div className="mb-4">
              <h2 className="text-2xl font-black">Tu puntuación</h2>
              <p className="mt-1 text-sm text-slate-300">
                Resumen de puntos que ya llevas acumulados.
              </p>
            </div>
            <ScoreBreakdownCard score={score} />
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
