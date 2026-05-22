import Link from "next/link";
import { CalendarDays, Settings, Trash2, Trophy, Users } from "lucide-react";
import { deleteLeagueAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { LeagueCodeBox, StatCard, StageTabs } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";

export default async function AdminLeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: league }, { count: users }, { data: scores }] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("league_members")
      .select("*", { count: "exact", head: true })
      .eq("league_id", leagueId),
    supabase
      .from("scores")
      .select("*")
      .eq("league_id", leagueId)
      .order("total_points", { ascending: false })
      .limit(1),
  ]);

  return (
    <AdminLayout leagueId={leagueId}>
      <StageTabs
        items={[
          { href: `/admin/leagues/${leagueId}`, label: "Resumen" },
          { href: `/admin/leagues/${leagueId}/users`, label: "Usuarios" },
          { href: `/admin/leagues/${leagueId}/matches`, label: "Partidos" },
          { href: `/admin/leagues/${leagueId}/scorers`, label: "Goleadores" },
          { href: `/admin/leagues/${leagueId}/awards`, label: "Premios" },
          { href: `/admin/leagues/${leagueId}/settings`, label: "Puntuacion" },
          { href: `/admin/leagues/${leagueId}/predictions`, label: "Apuestas" },
          { href: `/admin/leagues/${leagueId}/ranking`, label: "Ranking" },
          { href: `/admin/leagues/${leagueId}/logs`, label: "Logs" },
        ]}
        active="Resumen"
      />
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">{league?.name}</h1>
          <span className="badge mt-3">
            {STATUS_LABELS[league?.status ?? "open"]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/league/${leagueId}`} className="btn-secondary">
            Entrar como usuario
          </Link>
          <form action={deleteLeagueAction}>
            <input type="hidden" name="league_id" value={leagueId} />
            <button className="btn-danger">
              <Trash2 className="h-4 w-4" />
              Eliminar liga
            </button>
          </form>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Participantes" value={users ?? 0} icon={<Users />} />
        <StatCard
          label="Lider actual"
          value={scores?.[0]?.total_points ?? 0}
          icon={<Trophy />}
        />
        <StatCard
          label="Estado"
          value={STATUS_LABELS[league?.status ?? "open"]}
          icon={<CalendarDays />}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        {league ? <LeagueCodeBox code={league.code} /> : null}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xl font-black">Acciones rapidas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link className="btn-primary" href={`/admin/leagues/${leagueId}/daily`}>
              <CalendarDays className="h-5 w-5" />
              Vista rapida
            </Link>
            <Link className="btn-secondary" href={`/admin/leagues/${leagueId}/settings`}>
              <Settings className="h-5 w-5" />
              Puntuacion
            </Link>
            <Link className="btn-secondary" href={`/admin/leagues/${leagueId}/users`}>
              <Users className="h-5 w-5" />
              Usuarios y pagos
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
