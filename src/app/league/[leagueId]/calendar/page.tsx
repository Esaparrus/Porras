import { CalendarDays } from "lucide-react";
import { MatchCalendar, buildCalendarMonths } from "@/components/match-calendar";
import { UserLayout } from "@/components/layouts";
import { EmptyState } from "@/components/ui";
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
  const datedMatches = ((matches ?? []) as Match[])
    .filter((match) => match.match_date)
    .map((match) => ({
      ...match,
      prediction: predictionByMatchId.get(match.id) ?? null,
    }));
  const calendarMonths = buildCalendarMonths(datedMatches);

  return (
    <UserLayout leagueId={leagueId}>
      <section className="glass rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#27e7ff]/12 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[#27e7ff]">
              <CalendarDays className="h-4 w-4" />
              Nuevo panel
            </div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Calendario de partidos</h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Junio y julio en vista rapida. Cada dia con punto rosa tiene partidos, y al desplegarlo ves hora y tu marcador.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#ff2bd6]/25 bg-[#ff2bd6]/10 px-5 py-4 text-right">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#ffc7f4]">
              Acceso rapido
            </div>
            <div className="mt-2 text-3xl font-black text-white">{datedMatches.length}</div>
            <div className="text-sm text-slate-300">partidos con fecha</div>
          </div>
        </div>
      </section>

      <div className="mt-6">
        {datedMatches.length ? (
          <MatchCalendar leagueId={leagueId} months={calendarMonths} />
        ) : (
          <EmptyState
            title="Sin fechas cargadas"
            text="Todavia no hay partidos con fecha para pintar el calendario."
          />
        )}
      </div>
    </UserLayout>
  );
}
