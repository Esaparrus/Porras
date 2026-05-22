import Link from "next/link";
import { Eye, Pencil, ShieldCheck, ShieldX, Trophy } from "lucide-react";
import { UserLayout } from "@/components/layouts";
import { GroupStandingTable, ScoreBreakdownCard, StatCard } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/data";
import { getPaymentStatusCopy } from "@/lib/league-insights";
import { calculateRealGroupStandings } from "@/lib/scoring";
import type { Match, Team } from "@/lib/types";

export default async function LeagueHomePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();
  const [
    { data: league },
    { data: score },
    { data: ranking },
    { data: teams },
    { data: matches },
    { data: membership },
  ] = await Promise.all([
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
    supabase.from("teams").select("*").order("group_letter").order("manual_order"),
    supabase.from("matches").select("*").eq("stage", "group"),
    supabase
      .from("league_members")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const position = (ranking ?? []).findIndex((row) => row.user_id === user.id) + 1;
  const teamRows = (teams ?? []) as Team[];
  const matchRows = (matches ?? []) as Match[];
  const groupLetters = Array.from(
    new Set(teamRows.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const paymentStatus = membership?.payment_status ?? "pending";
  const paymentCopy = getPaymentStatusCopy(paymentStatus);
  const PaymentIcon = paymentStatus === "paid" ? ShieldCheck : ShieldX;

  return (
    <UserLayout leagueId={leagueId}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">{league?.name}</h1>
          <span className="badge mt-3">{STATUS_LABELS[league?.status ?? "open"]}</span>
        </div>
        <div className="rounded-2xl bg-[#ff2bd6] px-5 py-3 text-2xl font-black text-[#08111f]">
          {score?.total_points ?? 0} pts
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Tu posicion" value={position || "-"} icon={<Trophy />} />
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

      <div className="mt-4 glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Tu estado de pago</h2>
            <p className="mt-1 text-sm text-slate-300">{paymentCopy.playful}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <PaymentIcon className="h-6 w-6 text-[#27e7ff]" />
            </div>
            <Link href={`/league/${leagueId}/profile`} className="btn-secondary">
              Ajustar perfil
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Tablas del Mundial</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              Se actualizan solas al guardar resultados reales.
            </p>
          </div>
          <span className="badge">{groupLetters.length} grupos</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {groupLetters.map((group) => (
            <div key={group} className="glass rounded-2xl p-4">
              <h3 className="mb-3 font-black">Grupo {group}</h3>
              <GroupStandingTable
                rows={calculateRealGroupStandings(teamRows, matchRows, group)}
              />
            </div>
          ))}
        </div>
      </section>
    </UserLayout>
  );
}
