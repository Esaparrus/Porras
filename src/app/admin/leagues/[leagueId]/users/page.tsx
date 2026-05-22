import {
  resetUserBlockAction,
  updateLeagueMemberPaymentStatusAction,
} from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { EmptyState, PaymentStatusChip, StatCard } from "@/components/ui";
import { countPayments, formatAdminDate, getMemberScore } from "@/lib/admin";
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
    .eq("league_id", leagueId)
    .order("joined_at", { ascending: false });

  const normalizedMembers = (members ?? []).map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    const score = Array.isArray(member.scores) ? member.scores[0] : member.scores;

    return {
      ...member,
      profile,
      scoreSummary: getMemberScore(score),
    };
  });

  const paymentSummary = countPayments(
    normalizedMembers.map((member) => member.payment_status ?? "pending"),
  );

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Usuarios</h1>
      <p className="mt-2 text-sm text-slate-300">
        Quién se ha unido, cuándo entró y si ya ha pagado la liga.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Usuarios" value={normalizedMembers.length} />
        <StatCard label="Pagados" value={paymentSummary.paid} />
        <StatCard label="Pendientes" value={paymentSummary.pending} />
      </div>

      <div className="mt-6 grid gap-4">
        {normalizedMembers.length ? (
          normalizedMembers.map((member) => (
            <div key={member.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">
                    {member.profile?.display_name ?? "Jugador"}
                  </h2>
                  <p className="text-sm text-slate-300">
                    @{member.profile?.username ?? "sin-usuario"}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Unido a la liga: {formatAdminDate(member.joined_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <PaymentStatusChip status={member.payment_status ?? "pending"} />
                  <div className="text-2xl font-black text-[#ff2bd6]">
                    {member.scoreSummary.total} pts
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-black/20 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Partidos
                  </div>
                  <div className="mt-1 text-2xl font-black">{member.scoreSummary.matches}</div>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Goleadores
                  </div>
                  <div className="mt-1 text-2xl font-black">{member.scoreSummary.scorers}</div>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Exactos
                  </div>
                  <div className="mt-1 text-2xl font-black">{member.scoreSummary.exact}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={updateLeagueMemberPaymentStatusAction}>
                  <input type="hidden" name="league_id" value={leagueId} />
                  <input type="hidden" name="target_user_id" value={member.user_id} />
                  <input
                    type="hidden"
                    name="payment_status"
                    value={member.payment_status === "paid" ? "pending" : "paid"}
                  />
                  <button
                    className={
                      member.payment_status === "paid" ? "btn-danger py-2" : "btn-primary py-2"
                    }
                  >
                    {member.payment_status === "paid"
                      ? "Marcar pendiente"
                      : "Marcar pagado"}
                  </button>
                </form>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Resets admin
                </div>
                <div className="flex flex-wrap gap-2">
                  {["matches", "scorers", "awards", "knockouts", "all"].map((block) => (
                    <form key={block} action={resetUserBlockAction}>
                      <input type="hidden" name="league_id" value={leagueId} />
                      <input type="hidden" name="target_user_id" value={member.user_id} />
                      <input type="hidden" name="block" value={block} />
                      <button
                        className={
                          block === "all" ? "btn-danger py-2" : "btn-secondary py-2"
                        }
                      >
                        Reset {block}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Todavía no hay usuarios"
            text="Cuando alguien entre con el código de la liga aparecerá aquí para gestionar su pago."
          />
        )}
      </div>
    </AdminLayout>
  );
}
