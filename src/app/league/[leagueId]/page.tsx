import Link from "next/link";
import {
  BadgeEuro,
  CalendarDays,
  Eye,
  Pencil,
  ShieldCheck,
  ShieldX,
  Trophy,
  Users,
} from "lucide-react";
import { UserLayout } from "@/components/layouts";
import { LeagueCodeBox, ScoreBreakdownCard, StatCard } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/data";
import {
  calculateLeaguePot,
  calculatePrizeBreakdown,
  formatCurrency,
  getPaymentStatusCopy,
} from "@/lib/league-insights";
import type { LeagueMember } from "@/lib/types";

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
    { data: matches },
    { data: membership },
    { data: members },
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
    supabase.from("matches").select("id,is_finished"),
    supabase
      .from("league_members")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("league_members").select("*").eq("league_id", leagueId),
  ]);

  const position = (ranking ?? []).findIndex((row) => row.user_id === user.id) + 1;
  const memberRows = (members ?? []) as LeagueMember[];
  const memberCount = memberRows.length;
  const paidCount = memberRows.filter((member) => member.payment_status === "paid").length;
  const pendingCount = Math.max(0, memberCount - paidCount);
  const finishedMatches = (matches ?? []).filter((match) => match.is_finished).length;
  const totalMatches = matches?.length ?? 0;
  const totalPot = league ? calculateLeaguePot(league, memberCount) : 0;
  const prizes = league
    ? calculatePrizeBreakdown(league, totalPot)
    : { first: 0, second: 0, third: 0, remainder: 0 };
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

      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Datos de la liga</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              Resumen rapido de bote, premios, participantes y estado.
            </p>
          </div>
          <span className="badge">{league?.code}</span>
        </div>

        {league ? <LeagueCodeBox code={league.code} /> : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Participantes" value={memberCount} icon={<Users />} />
          <StatCard label="Entrada" value={formatCurrency(league?.entry_price ?? 0)} icon={<BadgeEuro />} />
          <StatCard label="Bote" value={formatCurrency(totalPot)} icon={<Trophy />} />
          <StatCard label="Partidos cerrados" value={`${finishedMatches}/${totalMatches}`} icon={<CalendarDays />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="glass rounded-3xl p-5">
            <h3 className="text-xl font-black">Premios</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/25 p-4">
                <div className="text-sm font-semibold text-slate-300">1º puesto</div>
                <div className="mt-1 text-2xl font-black text-[#f6c344]">
                  {formatCurrency(prizes.first)}
                </div>
              </div>
              <div className="rounded-2xl bg-black/25 p-4">
                <div className="text-sm font-semibold text-slate-300">2º puesto</div>
                <div className="mt-1 text-2xl font-black text-[#dbe4f0]">
                  {formatCurrency(prizes.second)}
                </div>
              </div>
              <div className="rounded-2xl bg-black/25 p-4">
                <div className="text-sm font-semibold text-slate-300">3º puesto</div>
                <div className="mt-1 text-2xl font-black text-[#d69659]">
                  {formatCurrency(prizes.third)}
                </div>
              </div>
            </div>
            {prizes.remainder ? (
              <p className="mt-3 text-sm font-semibold text-slate-300">
                Resto sin asignar: {formatCurrency(prizes.remainder)}
              </p>
            ) : null}
          </div>

          <div className="glass rounded-3xl p-5">
            <h3 className="text-xl font-black">Participantes y pagos</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-400/15 p-4">
                <div className="text-sm font-semibold text-emerald-100">Pagados</div>
                <div className="mt-1 text-3xl font-black">{paidCount}</div>
              </div>
              <div className="rounded-2xl bg-rose-500/15 p-4">
                <div className="text-sm font-semibold text-rose-100">Pendientes</div>
                <div className="mt-1 text-3xl font-black">{pendingCount}</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-black/25 p-4 text-sm font-semibold text-slate-300">
              Liga {STATUS_LABELS[league?.status ?? "open"]}. Las apuestas estan{" "}
              {league?.predictions_visible ? "visibles" : "ocultas"} para los jugadores.
            </div>
          </div>
        </div>
      </section>
    </UserLayout>
  );
}
