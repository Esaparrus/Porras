import { AdminLayout } from "@/components/layouts";
import { requireAdmin } from "@/lib/data";

export default async function LogsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const { data: logs } = await supabase
    .from("admin_logs")
    .select("*, admin:profiles!admin_logs_admin_user_id_fkey(display_name), target:profiles!admin_logs_target_user_id_fkey(display_name)")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Logs</h1>
      <div className="mt-6 space-y-3">
        {(logs ?? []).map((log) => (
          <div key={log.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong>{log.action_type}</strong>
              <span className="text-sm text-slate-400">
                {new Date(log.created_at).toLocaleString("es-ES")}
              </span>
            </div>
            <p className="mt-2 text-slate-300">{log.description}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
