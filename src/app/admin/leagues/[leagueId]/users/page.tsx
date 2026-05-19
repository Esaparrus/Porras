import { resetUserBlockAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { requireAdmin } from "@/lib/data";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const { data: members } = await supabase
    .from("league_members")
    .select("*, profiles(*), scores(*)")
    .eq("league_id", leagueId);

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Usuarios</h1>
      <div className="mt-6 grid gap-4">
        {(members ?? []).map((member) => (
          <div key={member.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{member.profiles?.display_name}</h2>
                <p className="text-sm text-slate-300">@{member.profiles?.username}</p>
              </div>
              <div className="text-2xl font-black text-[#d6b25e]">
                {member.scores?.[0]?.total_points ?? 0} pts
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["matches", "scorers", "awards", "knockouts", "all"].map((block) => (
                <form key={block} action={resetUserBlockAction}>
                  <input type="hidden" name="league_id" value={leagueId} />
                  <input type="hidden" name="target_user_id" value={member.user_id} />
                  <input type="hidden" name="block" value={block} />
                  <button className={block === "all" ? "btn-danger py-2" : "btn-secondary py-2"}>
                    Reset {block}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
