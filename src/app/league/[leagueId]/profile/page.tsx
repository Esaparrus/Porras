import { updateOwnLeaguePaymentStatusAction } from "@/app/actions";
import { UserLayout } from "@/components/layouts";
import { PaymentStatusChip } from "@/components/ui";
import {
  calculateLeaguePot,
  calculatePrizeBreakdown,
  formatCurrency,
  getPaymentStatusCopy,
} from "@/lib/league-insights";
import { requireUser } from "@/lib/data";

export default async function LeagueProfilePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: league }, { data: membership }, { count: memberCount }] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("league_members")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("league_members")
      .select("*", { count: "exact", head: true })
      .eq("league_id", leagueId),
  ]);

  const paymentStatus = membership?.payment_status ?? "pending";
  const paymentCopy = getPaymentStatusCopy(paymentStatus);
  const totalPot = league ? calculateLeaguePot(league, memberCount ?? 0) : 0;
  const prizes = league
    ? calculatePrizeBreakdown(league, totalPot)
    : { first: 0, second: 0, third: 0, remainder: 0 };

  return (
    <UserLayout leagueId={leagueId}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-black">Mi perfil en la porra</h1>
          <p className="mt-2 text-slate-300">
            Marca si ya has pagado o si sigues en modo moroso con glamour.
          </p>
        </div>

        <section className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Estado actual</h2>
              <p className="mt-1 text-sm text-slate-300">{paymentCopy.playful}</p>
            </div>
            <PaymentStatusChip status={paymentStatus} />
          </div>

          <form action={updateOwnLeaguePaymentStatusAction} className="mt-6 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="league_id" value={leagueId} />
            <button
              name="payment_status"
              value="paid"
              className="btn-secondary"
            >
              Ya he pagado
            </button>
            <button
              name="payment_status"
              value="pending"
              className="btn-danger"
            >
              Sigo debiendo pasta
            </button>
          </form>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-xl font-black">Bote de la liga</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-sm text-slate-300">Jugadores</div>
              <div className="mt-1 text-2xl font-black">{memberCount ?? 0}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-sm text-slate-300">Entrada</div>
              <div className="mt-1 text-2xl font-black">{formatCurrency(league?.entry_price ?? 0)}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-sm text-slate-300">Bote</div>
              <div className="mt-1 text-2xl font-black text-[#27e7ff]">{formatCurrency(totalPot)}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-sm text-slate-300">Top 3</div>
              <div className="mt-1 text-sm font-black">
                {formatCurrency(prizes.first)} / {formatCurrency(prizes.second)} / {formatCurrency(prizes.third)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </UserLayout>
  );
}
