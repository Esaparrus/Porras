import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { AdminLayout } from "@/components/layouts";
import { LeagueCodeBox, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/constants";

export default async function AdminLeaguesPage() {
  const { supabase } = await requireAdmin();
  const { data: leagues } = await supabase
    .from("leagues")
    .select("*, league_members(count)")
    .order("created_at", { ascending: false });

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Ligas</h1>
          <p className="mt-1 text-slate-300">Crea, entra y controla cualquier liga.</p>
        </div>
        <Link href="/admin/leagues/new" className="btn-primary">
          <Plus className="h-5 w-5" />
          Crear nueva liga
        </Link>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(leagues ?? []).map((league) => (
          <Link
            key={league.id}
            href={`/admin/leagues/${league.id}`}
            className="glass rounded-3xl p-5 transition hover:bg-white/12"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">{league.name}</h2>
                <span className="badge mt-2">
                  {STATUS_LABELS[league.status] ?? league.status}
                </span>
              </div>
              <StatCard
                label="Participantes"
                value={league.league_members?.[0]?.count ?? 0}
                icon={<Users className="h-4 w-4" />}
              />
            </div>
            <div className="mt-5">
              <LeagueCodeBox code={league.code} />
            </div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
