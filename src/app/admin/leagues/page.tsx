import Link from "next/link";
import { Plus, Trash2, Users } from "lucide-react";
import {
  deleteLeagueAction,
  updateLeagueMemberPaymentStatusAction,
} from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { EmptyState, LeagueCodeBox, PaymentStatusChip, StatCard } from "@/components/ui";
import { countPayments } from "@/lib/admin";
import { STATUS_LABELS } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { League, LeagueMember, Profile } from "@/lib/types";

type AdminLeagueProfile = Pick<Profile, "display_name" | "username">;
type AdminLeagueMember = Pick<LeagueMember, "user_id" | "payment_status"> & {
  profiles?: AdminLeagueProfile | AdminLeagueProfile[] | null;
};
type AdminLeagueRow = League & {
  league_members?: AdminLeagueMember[] | null;
};

export default async function AdminLeaguesPage() {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const { data: leagues, error } = await supabase
    .from("leagues")
    .select("*, league_members(user_id, payment_status, profiles(display_name, username))")
    .order("created_at", { ascending: false });

  const normalizedLeagues = ((leagues ?? []) as AdminLeagueRow[]).map((league) => {
    const members = (league.league_members ?? []).map((member: AdminLeagueMember) => {
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;

      return {
        ...member,
        profile,
      };
    });

    return {
      ...league,
      members,
      paymentSummary: countPayments(
        members.map((member) => member.payment_status ?? "pending"),
      ),
    };
  });

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Ligas</h1>
          <p className="mt-1 max-w-2xl text-slate-300">
            Aquí ves todas las ligas creadas, quién está dentro y qué pagos faltan.
          </p>
        </div>
        <Link href="/admin/leagues/new" className="btn-primary">
          <Plus className="h-5 w-5" />
          Crear nueva liga
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">
          No se pudieron cargar las ligas ahora mismo. Revisa la configuración de Supabase o vuelve a intentarlo.
        </div>
      ) : normalizedLeagues.length ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {normalizedLeagues.map((league) => (
            <div key={league.id} className="glass rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/leagues/${league.id}`}
                    className="text-2xl font-black transition hover:text-[#27e7ff]"
                  >
                    {league.name}
                  </Link>
                  <span className="badge mt-2">
                    {STATUS_LABELS[league.status] ?? league.status}
                  </span>
                </div>
                <StatCard
                  label="Participantes"
                  value={league.members.length}
                  icon={<Users className="h-4 w-4" />}
                />
              </div>
              <div className="mt-5">
                <LeagueCodeBox code={league.code} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Estado de pagos
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <div className="rounded-2xl bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Pagados
                      </div>
                      <div className="text-2xl font-black text-emerald-300">
                        {league.paymentSummary.paid}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Pendientes
                      </div>
                      <div className="text-2xl font-black text-rose-300">
                        {league.paymentSummary.pending}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Usuarios dentro
                    </div>
                    <Link
                      href={`/admin/leagues/${league.id}/users`}
                      className="text-xs font-bold uppercase tracking-wide text-[#27e7ff]"
                    >
                      Ver todos
                    </Link>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {league.members.length ? (
                      league.members.slice(0, 4).map((member) => (
                        <div
                          key={member.user_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-3"
                        >
                          <div>
                            <div className="font-bold text-white">
                              {member.profile?.display_name ?? "Jugador"}
                            </div>
                            <div className="text-xs text-slate-400">
                              @{member.profile?.username ?? "sin-usuario"}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <PaymentStatusChip status={member.payment_status ?? "pending"} compact />
                            <form action={updateLeagueMemberPaymentStatusAction}>
                              <input type="hidden" name="league_id" value={league.id} />
                              <input type="hidden" name="target_user_id" value={member.user_id} />
                              <input
                                type="hidden"
                                name="payment_status"
                                value={member.payment_status === "paid" ? "pending" : "paid"}
                              />
                              <button className="btn-secondary py-2">
                                {member.payment_status === "paid" ? "Pendiente" : "Pagado"}
                              </button>
                            </form>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-300">
                        Todavía no hay usuarios dentro de esta liga.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/admin/leagues/${league.id}`} className="btn-primary py-2">
                  Abrir liga
                </Link>
                <Link href={`/admin/leagues/${league.id}/users`} className="btn-secondary py-2">
                  Gestionar usuarios
                </Link>
                <form action={deleteLeagueAction}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <button className="btn-danger py-2">
                    <Trash2 className="h-4 w-4" />
                    Eliminar liga
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Aún no hay ligas creadas"
            text="Todavía no existe ninguna liga en la base de datos. Crea una nueva para empezar a gestionar usuarios, pagos y clasificación."
          />
        </div>
      )}
    </AdminLayout>
  );
}
