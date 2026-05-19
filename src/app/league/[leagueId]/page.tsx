import Link from "next/link";
import { Eye, Pencil, Trophy } from "lucide-react";
import { UserLayout } from "@/components/layouts";
import { ScoreBreakdownCard, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/constants";

export default async function LeagueHomePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: league }, { data: score }, { data: ranking }] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("scores")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("user_id,total_points")
      .eq("league_id", leagueId)
      .order("total_points", { ascending: false }),
  ]);
  const position = (ranking ?? []).findIndex((row) => row.user_id === user.id) + 1;

  return (
    <UserLayout leagueId={leagueId}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">{league?.name}</h1>
          <span className="badge mt-3">
            {STATUS_LABELS[league?.status ?? "open"]}
          </span>
        </div>
        <div className="rounded-2xl bg-[#d6b25e] px-5 py-3 text-2xl font-black text-[#08111f]">
          {score?.total_points ?? 0} pts
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Tu posición" value={position || "-"} icon={<Trophy />} />
        <StatCard label="Exactos" value={score?.exact_scores_count ?? 0} />
        <StatCard label="Estado" value={STATUS_LABELS[league?.status ?? "open"]} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="glass rounded-3xl p-5">
          <h2 className="text-xl font-black">Acciones</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href={`/league/${leagueId}/predictions`} className="btn-primary">
              <Pencil className="h-5 w-5" />
              Hacer mis apuestas
            </Link>
            <Link href={`/league/${leagueId}/ranking`} className="btn-secondary">
              <Trophy className="h-5 w-5" />
              Ver clasificación
            </Link>
            <Link href={`/league/${leagueId}/players`} className="btn-secondary">
              <Eye className="h-5 w-5" />
              Ver apuestas
            </Link>
          </div>
        </div>
        <ScoreBreakdownCard score={score} />
      </div>
    </UserLayout>
  );
}
