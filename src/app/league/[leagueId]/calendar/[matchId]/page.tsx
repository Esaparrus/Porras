import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, BarChart3, CalendarDays } from "lucide-react";
import { MatchPredictionScorePill, PredictionScorePill } from "@/components/match-calendar";
import { UserLayout } from "@/components/layouts";
import { MatchTeamLabel } from "@/components/ui";
import { ExpandableScoreGroup } from "@/components/expandable-score-group";
import { requireUser } from "@/lib/data";
import { buildUserKnockoutEntrants, knockoutMarkerCounts } from "@/lib/user-bracket";
import type {
  Match,
  MatchPrediction,
  PredictionTiebreakSelection,
  Team,
} from "@/lib/types";

function groupByUserId<T extends { user_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.user_id);
    if (list) list.push(row);
    else map.set(row.user_id, [row]);
  }
  return map;
}

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

  // En eliminatorias el marcador solo cuenta si el bracket del usuario coloca las
  // dos selecciones que de verdad juegan este cruce. Reconstruimos el cuadro de
  // cada participante para mostrar únicamente a quienes aciertan ambas (a mí
  // siempre se me evalúa; al resto solo si las apuestas son visibles).
  const isKnockout = match.stage !== "group";
  const realTeamsKnown = match.home_team_id != null && match.away_team_id != null;
  // Solo filtramos cuando ya se conocen las dos selecciones que juegan el cruce:
  // antes de eso no hay un emparejamiento real contra el que comparar el cuadro.
  const applyKnockoutFilter = isKnockout && realTeamsKnown;
  let countingUserIds: Set<string> | null = null;
  if (applyKnockoutFilter) {
    const candidateIds = new Set<string>([user.id]);
    if (visible) {
      visiblePredictionRows.forEach((row) => candidateIds.add(row.user_id));
    }

    const [{ data: allTeams }, { data: allMatches }, { data: allPredictions }, { data: allTiebreaks }] =
      await Promise.all([
        supabase.from("teams").select("*"),
        supabase.from("matches").select("*"),
        visible
          ? supabase.from("match_predictions").select("*").eq("league_id", leagueId)
          : supabase
              .from("match_predictions")
              .select("*")
              .eq("league_id", leagueId)
              .eq("user_id", user.id),
        visible
          ? supabase.from("prediction_tiebreak_selections").select("*").eq("league_id", leagueId)
          : supabase
              .from("prediction_tiebreak_selections")
              .select("*")
              .eq("league_id", leagueId)
              .eq("user_id", user.id),
      ]);

    const teamRows = (allTeams ?? []) as Team[];
    const matchRows = (allMatches ?? []) as Match[];
    const groupLetters = Array.from(
      new Set(teamRows.map((team) => team.group_letter).filter(Boolean)),
    ) as string[];
    const predictionsByUser = groupByUserId((allPredictions ?? []) as MatchPrediction[]);
    const tiebreaksByUser = groupByUserId(
      (allTiebreaks ?? []) as PredictionTiebreakSelection[],
    );
    const matchNumber = match.match_number ?? 0;

    countingUserIds = new Set<string>();
    for (const candidate of candidateIds) {
      const entrants = buildUserKnockoutEntrants({
        teams: teamRows,
        matches: matchRows,
        predictions: predictionsByUser.get(candidate) ?? [],
        tiebreakSelections: tiebreaksByUser.get(candidate) ?? [],
        groupLetters,
      });
      if (knockoutMarkerCounts(match, entrants.get(matchNumber))) {
        countingUserIds.add(candidate);
      }
    }
  }

  const ownMarkerHidden = applyKnockoutFilter && !countingUserIds?.has(user.id);
  const compareMarkerHidden =
    applyKnockoutFilter &&
    comparePrediction != null &&
    !countingUserIds?.has(comparePrediction.user_id);
  const counting = countingUserIds;
  const countingPredictionRows =
    applyKnockoutFilter && counting
      ? visiblePredictionRows.filter((row) => counting.has(row.user_id))
      : visiblePredictionRows;

  const popularScores = Array.from(
    countingPredictionRows.reduce((map, prediction) => {
      if (
        prediction.predicted_home_score === null ||
        prediction.predicted_away_score === null
      ) {
        return map;
      }

      const key = `${prediction.predicted_home_score}-${prediction.predicted_away_score}`;
      const current = map.get(key);
      const profile = prediction.profiles;
      const displayName = profile?.display_name || profile?.username || "Jugador";
      const avatarEmoji = profile?.avatar_emoji ?? null;
      const users = [...(current?.users ?? []), { displayName, avatarEmoji }];
      map.set(key, {
        key,
        homeScore: prediction.predicted_home_score,
        awayScore: prediction.predicted_away_score,
        count: users.length,
        users,
      });
      return map;
    }, new Map<string, { key: string; homeScore: number; awayScore: number; count: number; users: { displayName: string; avatarEmoji: string | null }[] }>()),
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
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="min-w-0 text-right text-lg sm:text-2xl">
                <MatchTeamLabel team={match.home_team} placeholder={match.home_placeholder} />
              </div>
              <PredictionScorePill
                homeScore={match.home_score}
                awayScore={match.away_score}
                className="bg-white/10 text-slate-200"
              />
              <div className="min-w-0 text-lg sm:text-2xl">
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
            {ownMarkerHidden ? (
              <p className="mt-4 text-sm font-semibold text-slate-300">
                Tu marcador no cuenta en este cruce: tu cuadro no enfrenta a estas dos
                selecciones, así que no se muestra.
              </p>
            ) : (
              <MatchPredictionScorePill
                homeScore={ownPrediction?.predicted_home_score}
                awayScore={ownPrediction?.predicted_away_score}
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                large
                className="mt-4"
              />
            )}
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ffcf9f]">
                          Ha puesto
                        </div>
                        <div className="mt-1 break-words text-xl font-black leading-tight text-white">
                          {compareMeta.avatarEmoji ? `${compareMeta.avatarEmoji} ` : ""}
                          {compareMeta.displayName}
                        </div>
                      </div>
                      {compareMarkerHidden ? null : (
                        <MatchPredictionScorePill
                          homeScore={comparePrediction.predicted_home_score}
                          awayScore={comparePrediction.predicted_away_score}
                          homeTeam={match.home_team}
                          awayTeam={match.away_team}
                        />
                      )}
                    </div>
                    {compareMarkerHidden ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-slate-300">
                        Su marcador no cuenta en este cruce: su cuadro no enfrenta a estas dos
                        selecciones, así que no se muestra.
                      </div>
                    ) : ownMarkerHidden ? null : (
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
                    )}
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
                  <ExpandableScoreGroup
                    key={score.key}
                    homeScore={score.homeScore}
                    awayScore={score.awayScore}
                    users={score.users}
                    homePill={
                      <MatchPredictionScorePill
                        homeScore={score.homeScore}
                        awayScore={score.awayScore}
                        homeTeam={match.home_team}
                        awayTeam={match.away_team}
                        className="shrink-0"
                      />
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
                {applyKnockoutFilter
                  ? "Nadie tiene en su cuadro a estas dos selecciones en este cruce, así que todavía no hay marcadores que cuenten."
                  : "Aun no hay resultados completos guardados por la gente para este partido."}
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
