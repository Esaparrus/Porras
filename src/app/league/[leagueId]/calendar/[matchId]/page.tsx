import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatMatchDate,
  formatMatchTime,
  MatchPredictionHero,
  PredictionDistribution,
} from "@/components/match-calendar";
import { UserLayout } from "@/components/layouts";
import { STAGE_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/data";
import type { LeagueMember, MatchPrediction, Profile } from "@/lib/types";

type MemberWithProfile = LeagueMember & {
  profiles?: Pick<Profile, "display_name" | "username"> | Array<Pick<Profile, "display_name" | "username">> | null;
};

type PredictionWithProfile = MatchPrediction & {
  profiles?: Pick<Profile, "display_name" | "username"> | null;
};

export default async function CalendarMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string; matchId: string }>;
  searchParams: Promise<{ compareUserId?: string }>;
}) {
  const { leagueId, matchId } = await params;
  const { compareUserId } = await searchParams;
  const { supabase, user } = await requireUser();
  const [
    { data: league },
    { data: match },
    { data: myPrediction },
    { data: members },
    { data: allPredictions },
    { count: finishedMatches },
  ] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .eq("id", matchId)
      .single(),
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .eq("match_id", matchId)
      .maybeSingle(),
    supabase
      .from("league_members")
      .select("*, profiles(display_name, username)")
      .eq("league_id", leagueId),
    supabase
      .from("match_predictions")
      .select("*, profiles(display_name, username)")
      .eq("league_id", leagueId)
      .eq("match_id", matchId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("is_finished", true),
  ]);

  if (!match) notFound();

  const comparisonsVisible =
    Boolean(league?.predictions_visible) ||
    league?.status !== "open" ||
    (finishedMatches ?? 0) > 0;
  const memberRows = ((members ?? []) as MemberWithProfile[])
    .filter((member) => member.user_id !== user.id)
    .map((member) => ({
      userId: member.user_id,
      profile: normalizeProfile(member.profiles),
    }))
    .sort((left, right) =>
      getProfileName(left.profile).localeCompare(getProfileName(right.profile)),
    );
  const selectedUserId = compareUserId && memberRows.some((member) => member.userId === compareUserId)
    ? compareUserId
    : memberRows[0]?.userId;
  const predictionRows = (allPredictions ?? []) as PredictionWithProfile[];
  const selectedPrediction = comparisonsVisible
    ? predictionRows.find((prediction) => prediction.user_id === selectedUserId)
    : null;
  const selectedProfile = memberRows.find((member) => member.userId === selectedUserId)?.profile;

  return (
    <UserLayout leagueId={leagueId}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/league/${leagueId}/calendar`}
              className="text-sm font-black uppercase text-[#27e7ff] hover:text-white"
            >
              Volver al calendario
            </Link>
            <h1 className="mt-2 text-3xl font-black">
              {match.home_team?.short_name ?? match.home_placeholder ?? "Local"} vs{" "}
              {match.away_team?.short_name ?? match.away_placeholder ?? "Visitante"}
            </h1>
            <p className="mt-2 text-slate-300">
              {formatMatchDate(match.match_date)} · {formatMatchTime(match.match_date)} ·{" "}
              {STAGE_LABELS[match.stage] ?? match.stage}
            </p>
          </div>
          <span className="badge">{match.venue ?? "Sede por definir"}</span>
        </div>

        <MatchPredictionHero title="Tu resultado" match={match} prediction={myPrediction} />

        {comparisonsVisible ? (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="glass rounded-3xl p-5">
              <h2 className="text-2xl font-black">Comparar con</h2>
              <form className="mt-4 space-y-4">
                <select name="compareUserId" defaultValue={selectedUserId} className="field">
                  {memberRows.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {getProfileName(member.profile)}
                    </option>
                  ))}
                </select>
                <button className="btn-primary w-full">Comparar</button>
              </form>

              <div className="mt-5 rounded-2xl bg-black/25 p-4">
                <div className="text-sm font-black uppercase text-slate-300">
                  {getProfileName(selectedProfile)}
                </div>
                <div className="mt-3 text-4xl font-black text-[#27e7ff]">
                  {formatCompactPrediction(selectedPrediction)}
                </div>
              </div>
            </section>

            <PredictionDistribution predictions={predictionRows} />
          </div>
        ) : (
          <section className="glass rounded-3xl p-5">
            <h2 className="text-2xl font-black">Comparaciones bloqueadas</h2>
            <p className="mt-2 text-slate-300">
              Las apuestas de otros jugadores apareceran cuando la liga las haga visibles o empiece a resolverse el Mundial.
            </p>
          </section>
        )}
      </div>
    </UserLayout>
  );
}

function normalizeProfile(
  profile?: Pick<Profile, "display_name" | "username"> | Array<Pick<Profile, "display_name" | "username">> | null,
) {
  return Array.isArray(profile) ? profile[0] : profile;
}

function getProfileName(profile?: Pick<Profile, "display_name" | "username"> | null) {
  return profile?.display_name || profile?.username || "Jugador";
}

function formatCompactPrediction(prediction?: MatchPrediction | null) {
  if (
    !prediction ||
    prediction.predicted_home_score === null ||
    prediction.predicted_away_score === null
  ) {
    return "Sin resultado";
  }

  return `${prediction.predicted_home_score}-${prediction.predicted_away_score}`;
}
