import Link from "next/link";
import { BarChart3, ClipboardList, Users } from "lucide-react";
import { AdminLayout } from "@/components/layouts";
import { requireAdmin } from "@/lib/data";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();
  const [{ count: leaguesCount }, { count: pendingCount }, { count: finishedMatches }] =
    await Promise.all([
      supabase.from("leagues").select("*", { count: "exact", head: true }),
      supabase
        .from("player_selection_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("is_finished", true),
    ]);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Centro de administrador</h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Desde aquí puedes cargar resultados, asignar goleadores, revisar nombres
            manuales y luego entrar a cualquier liga.
          </p>
        </div>
        <Link href="/admin/results" className="btn-primary">
          <ClipboardList className="h-5 w-5" />
          Ir a resultados
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-3xl p-5">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Partidos cerrados</div>
          <div className="mt-2 text-4xl font-black">{finishedMatches ?? 0}</div>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Revisiones pendientes</div>
          <div className="mt-2 text-4xl font-black">{pendingCount ?? 0}</div>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Ligas activas</div>
          <div className="mt-2 text-4xl font-black">{leaguesCount ?? 0}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Link href="/admin/results" className="glass rounded-3xl p-6 transition hover:bg-white/12">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-7 w-7" />
            <h2 className="text-2xl font-black">Resultados y goleadores</h2>
          </div>
          <p className="mt-3 text-slate-300">
            Lista completa de partidos para guardar marcador exacto, goleadores y tabla viva.
          </p>
        </Link>

        <Link href="/admin/leagues" className="glass rounded-3xl p-6 transition hover:bg-white/12">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7" />
            <h2 className="text-2xl font-black">Ligas</h2>
          </div>
          <p className="mt-3 text-slate-300">
            Gestiona usuarios, ranking, bloqueos y configuración de cada liga.
          </p>
        </Link>
      </div>

      <div className="mt-6 glass rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-2xl font-black">Flujo recomendado</h2>
        </div>
        <div className="mt-4 grid gap-3 text-slate-200 md:grid-cols-3">
          <div className="rounded-2xl bg-black/20 p-4">1. Entra en resultados para cerrar partidos y meter goleadores.</div>
          <div className="rounded-2xl bg-black/20 p-4">2. Revisa los nombres manuales que hayan enviado los usuarios.</div>
          <div className="rounded-2xl bg-black/20 p-4">3. Luego baja a ligas si quieres ver clasificación, pagos o apuestas.</div>
        </div>
      </div>
    </AdminLayout>
  );
}
