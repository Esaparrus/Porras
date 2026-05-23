import Link from "next/link";
import { UserLayout } from "@/components/layouts";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/data";

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireUser();
  const [{ data: league }, { data: members }, { count: finishedMatches }] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("league_members")
      .select("user_id, profiles(*), scores(*)")
      .eq("league_id", leagueId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("is_finished", true),
  ]);

  const visible =
    league?.predictions_visible ||
    league?.status !== "open" ||
    (finishedMatches ?? 0) > 0;
  type MemberRow = {
    user_id: string;
    profiles: { display_name?: string } | Array<{ display_name?: string }> | null;
    scores: Array<{ total_points?: number }> | null;
  };
  const memberRows = (members ?? []) as unknown as MemberRow[];

  return (
    <UserLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Participantes</h1>
      {!visible ? (
        <div className="mt-6">
          <EmptyState
            title="Apuestas ocultas"
            text="Se podran ver cuando empiece el Mundial, el admin bloquee la liga o active la visibilidad."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {memberRows.map((member) => {
            const profile = Array.isArray(member.profiles)
              ? member.profiles[0]
              : member.profiles;
            return (
            <Link
              key={member.user_id}
              href={`/league/${leagueId}/players/${member.user_id}`}
              className="glass rounded-2xl p-5"
            >
              <div className="text-xl font-black">{profile?.display_name}</div>
              <div className="mt-2 text-[#ff2bd6]">
                {member.scores?.[0]?.total_points ?? 0} puntos
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </UserLayout>
  );
}
