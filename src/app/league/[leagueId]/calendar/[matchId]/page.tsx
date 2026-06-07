import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, BarChart3, CalendarDays, Users } from "lucide-react";
import { PredictionScorePill } from "@/components/match-calendar";
import { UserLayout } from "@/components/layouts";
import { MatchTeamLabel } from "@/components/ui";
import { requireUser } from "@/lib/data";

type SearchParams = Promise<{
  compareUserId?: string | string[];
}>;

type MemberProfile =
  | {
      display_name?: string | null;
      username?: string | null;
      avatar_emoji?: string | null;
    }
  | Array<{
      display_name?: string | null;
      username?: string | null;
      avatar_emoji?: string | null;
    }>
  | null;

type MemberRow = {
  user_id: string;
  profiles: MemberProfile;
};

type PredictionRow = {
  id: string;
  user_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  profiles:
    | {
        display_name?: string | null;
        username?: string | null;
        avatar_emoji?: string | null;
      }
    | null;
};

export default async function MatchCalendarDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string; matchId: string }>;
  searchParams: SearchParams;
}) {
  const { leagueId, matchId } = await params;
  const { compareUserId: compareUserParam } = await searchParams;
  const compareUserId = Array.isArray(compareUserParam) ? compareUserParam[0] : compareUserParam;
  const { supabase, user } = await requireUser();
  const [{ data: league }, { data: match }, { count: finishedMatches }, { data: ownPrediction }, { data: members }] =
    await Promise.all([
      supabase.from("leagues").select("*").eq("id", leagueId).single(),
      supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .eq("id", matchId)
        .single(),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("is_finished", true),
      supabase
        .from("match_predictions")
        .select("*")
        .eq("league_id", leagueId)
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("league_members")
        .select("user_id, profiles(display_name, username, avatar_emoji)")
        .eq("league_id", leagueId),
    ]);

  if (!match) notFound();

  const visible =
    Boolean(league?.predictions_visible) ||
    league?.status !== "open" ||
    (finishedMatches ?? 0) > 0;

  const { data: visiblePredictions } = visible
    ? await supabase
        .from("match_predictions")
        .select("id, user_id, predicted_home_score, predicted_away_score, profiles(display_name, username, avatar_emoji)")
        .eq("league_id", leagueId)
        .eq("match_id", matchId)
    : { data: [] as PredictionRow[] };

  const memberRows = (members ?? []) as unknown as MemberRow[];
  const compareOptions = memberRows
    .filter((member) => member.user_id !== user.id)
    .map((member) => {
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
      return {
        userId: member.user_id,
        displayName: profile?.display_name || profile?.username || "Jugador",
        avatarEmoji: profile?.avatar_emoji ?? null,
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "es"));

  const visiblePredictionRows = (visiblePredictions ?? []) as PredictionRow[];
  const comparePrediction =
    compareUserId && visible
      ? visiblePredictionRows.find((prediction) => prediction.user_id === compareUserId) ?? null
      : null;
  const compareMeta = comparePrediction
    ? compareOptions.find((option) => option.userId === comparePrediction.user_id) ?? null
    : null;

  const popularScores = Array.from(
    visiblePredictionRows.reduce((map, prediction) => {
      if (
        prediction.predicted_home_score === null ||
        prediction.predicted_away_score === null
      ) {
        return map;
      }

      const key = `${prediction.predicted_home_score}-${prediction.predicted_away_score}`;
      const current = map.get(key);
      map.set(key, {
        key,
        homeScore: prediction.predicted_home_score,
        awayScore: prediction.predicted_away_score,
        count: (current?.count ?? 0) + 1,
      });
      return map;
    }, new Map<string, { key: string; homeScore: number; awayScore: number; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      if (left.homeScore !== right.homeScore) return left.homeScore - right.homeScore;
      return left.awayScore - right.awayScore;
    });

  const kickoffLabel = match.match_date
    ? new Intl.DateTimeFormat("es-ES", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Europe/Madrid",
      }).format(new Date(match.match_date))
    : "Hora por confirmar";

  return (
    <UserLayout leagueId={leagueId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/league/${leagueId}/calendar`}
            className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#27e7ff] hover:text-white"
          >
            <CalendarDays className="h-4 w-4" />
            Volver al calendario
          </Link>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Detalle del partido</h1>
          <p className="mt-2 text-sm text-slate-300">{kickoffLabel}</p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-right">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ffcf9f]">
            Partido
          </div>
          <div className="mt-1 text-2xl font-black text-white">#{match.match_number ?? "-"}</div>
        </div>
      </div>

      <section className="mt-6 glass rounded-[2rem] p-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
          <div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="text-right text-lg sm:text-2xl">
                <MatchTeamLabel team={match.home_team} placeholder={match.home_placeholder} />
              </div>
              <PredictionScorePill
                homeScore={match.home_score}
                awayScore={match.away_score}
                className="bg-white/10 text-slate-200"
              />
              <div className="text-lg sm:text-2xl">
                <MatchTeamLabel team={match.away_team} placeholder={match.away_placeholder} />
              </div>
            </div>
            <div className="mt-3 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Resultado real
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#ff2bd6]/25 bg-[linear-gradient(180deg,rgba(255,43,214,0.14),rgba(255,255,255,0.03))] p-5 text-center">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ffc4f3]">
              Tu resultado
            </div>
            <PredictionScorePill
              homeScore={ownPrediction?.predicted_home_score}
              awayScore={ownPrediction?.predicted_away_score}
              large
              className="mt-4"
            />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="glass rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#27e7ff]/12 p-3">
              <ArrowLeftRight className="h-5 w-5 text-[#27e7ff]" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Comparar con otra persona</h2>
              <p className="mt-1 text-sm text-slate-300">
                Elige a alguien de la porra y veras su marcador aqui mismo.
              </p>
            </div>
          </div>

          {visible ? (
            <>
              <form method="get" className="mt-5 flex flex-col gap-3 sm:flex-row">
                <select
                  name="compareUserId"
                  defaultValue={compareUserId ?? ""}
                  className="field flex-1"
                >
                  <option value="">Selecciona una persona</option>
                  {compareOptions.map((option) => (
                    <option key={option.userId} value={option.userId}>
                      {option.avatarEmoji ? `${option.avatarEmoji} ` : ""}
                      {option.displayName}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary sm:min-w-[170px]">Comparar</button>
              </form>

              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                {comparePrediction && compareMeta ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ffcf9f]">
                          Ha puesto
                        </div>
                        <div className="mt-1 text-xl font-black text-white">
                          {compareMeta.avatarEmoji ? `${compareMeta.avatarEmoji} ` : ""}
                          {compareMeta.displayName}
                        </div>
                      </div>
                      <PredictionScorePill
                        homeScore={comparePrediction.predicted_home_score}
                        awayScore={comparePrediction.predicted_away_score}
                      />
                    </div>
                    <div className="rounded-2xl border border-[#27e7ff]/20 bg-[#27e7ff]/8 px-4 py-3 text-sm font-semibold text-slate-200">
                      Tu marcador frente al suyo:{" "}
                      <span className="text-[#27e7ff]">
                        {(ownPrediction?.predicted_home_score ?? "-")} - {(ownPrediction?.predicted_away_score ?? "-")}
                      </span>{" "}
                      vs{" "}
                      <span className="text-[#ff9deb]">
                        {comparePrediction.predicted_home_score ?? "-"} - {comparePrediction.predicted_away_score ?? "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">
                    {compareUserId
                      ? "Esa persona todavia no tiene marcador guardado para este partido."
                      : "Selecciona una persona para ver rapidamente lo que ha puesto."}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
              La comparacion con otros se desbloquea cuando las apuestas de la liga son visibles.
            </div>
          )}
        </section>

        <section className="glass rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#ff2bd6]/12 p-3">
              <BarChart3 className="h-5 w-5 text-[#ff2bd6]" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Lo que ha puesto la gente</h2>
              <p className="mt-1 text-sm text-slate-300">
                Resumen rapido de marcadores repetidos para este partido.
              </p>
            </div>
          </div>

          {visible ? (
            popularScores.length ? (
              <div className="mt-5 space-y-3">
                {popularScores.map((score) => (
                  <div
                    key={score.key}
                    className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <PredictionScorePill
                        homeScore={score.homeScore}
                        awayScore={score.awayScore}
                      />
                      <div>
                        <div className="text-sm font-black text-white">
                          {score.count} persona{score.count === 1 ? "" : "s"}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          han puesto este resultado
                        </div>
                      </div>
                    </div>
                    <Users className="h-5 w-5 text-[#27e7ff]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
                Aun no hay resultados completos guardados por la gente para este partido.
              </div>
            )
          ) : (
            <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
              Este bloque aparecera cuando la liga permita ver apuestas del resto.
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  );
}
