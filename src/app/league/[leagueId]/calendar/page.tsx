import { LeagueCalendar } from "@/components/league-calendar";
import { UserLayout } from "@/components/layouts";
import { requireUser } from "@/lib/data";
import type { Match, MatchPrediction } from "@/lib/types";

export default async function LeagueCalendarPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true, nullsFirst: false }),
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id),
  ]);

  const predictionByMatchId = new Map(
    ((predictions ?? []) as MatchPrediction[]).map((prediction) => [prediction.match_id, prediction]),
  );
  const calendarMatches = ((matches ?? []) as Match[]).map((match) => ({
      ...match,
      myPrediction: predictionByMatchId.get(match.id) ?? null,
    }));

  return (
    <UserLayout leagueId={leagueId}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Calendario</h1>
            <p className="mt-2 text-slate-300">
              Junio y julio con tus resultados puestos para cada partido.
            </p>
          </div>
          <span className="badge">Mundial 2026</span>
        </div>

        <LeagueCalendar leagueId={leagueId} matches={calendarMatches} />
      </div>
    </UserLayout>
  );
}
