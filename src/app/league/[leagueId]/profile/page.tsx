import {
  updateOwnLeaguePaymentStatusAction,
  updateOwnProfileAction,
} from "@/app/actions";
import { UserLayout } from "@/components/layouts";
import { PaymentStatusChip } from "@/components/ui";
import {
  calculateLeaguePot,
  calculatePrizeBreakdown,
  formatCurrency,
  getPaymentStatusCopy,
} from "@/lib/league-insights";
import { requireUser } from "@/lib/data";

const PROFILE_AVATAR_EMOJIS = [
  "⚽",
  "🏆",
  "🔥",
  "💎",
  "🚀",
  "🧠",
  "🎯",
  "🍀",
  "⭐",
  "👑",
  "😎",
  "🤘",
  "🥶",
  "🥳",
  "🪄",
  "🎮",
  "🎲",
  "🧩",
  "🏅",
  "🥇",
  "🥈",
  "🥉",
  "🎖️",
  "🏟️",
  "🥅",
  "🏃",
  "💪",
  "👏",
  "🙌",
  "🤝",
  "👍",
  "👌",
  "✌️",
  "🤙",
  "💥",
  "⚡",
  "☄️",
  "🌪️",
  "🌈",
  "☀️",
  "🌙",
  "🌟",
  "✨",
  "💫",
  "🔮",
  "🧿",
  "💰",
  "💸",
  "🎰",
  "🃏",
  "♠️",
  "♥️",
  "♦️",
  "♣️",
  "🎵",
  "🎧",
  "🎤",
  "🎸",
  "🥁",
  "🎺",
  "🎹",
  "🎬",
  "📸",
  "💻",
  "📱",
  "⌚",
  "🕹️",
  "🏁",
  "🚩",
  "🧨",
  "🛡️",
  "⚔️",
  "🗡️",
  "💣",
  "🧱",
  "🧲",
  "🔋",
  "🪙",
  "🎁",
  "🎈",
  "🎉",
  "🎊",
  "🥂",
  "🍻",
  "🍕",
  "🍔",
  "🌮",
  "🍿",
  "🍩",
  "🍭",
  "🍒",
  "🍉",
  "🌶️",
  "💯",
  "🔝",
  "🆙",
  "🆒",
  "✅",
  "❌",
  "❓",
  "❗",
  "🔴",
  "🟠",
  "🟡",
  "🟢",
  "🔵",
  "🟣",
  "⚫",
  "⚪",
] as const;

export default async function LeagueProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { leagueId } = await params;
  const query = await searchParams;
  const { supabase, user, profile } = await requireUser();
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
            Elige como quieres aparecer en la clasificacion.
          </p>
        </div>

        {query.error ? (
          <div className="rounded-2xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-50">
            {query.error}
          </div>
        ) : null}

        {query.saved === "profile" ? (
          <div className="rounded-2xl border border-emerald-300/35 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-50">
            Perfil actualizado.
          </div>
        ) : null}

        <section className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Nombre de clasificacion</h2>
              <p className="mt-1 text-sm text-slate-300">
                Tu usuario sigue siendo @{profile.username}.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-black">
              {profile.avatar_emoji ? <span className="text-2xl">{profile.avatar_emoji}</span> : null}
              <span>{profile.display_name}</span>
            </div>
          </div>

          <form action={updateOwnProfileAction} className="mt-6 space-y-5">
            <input type="hidden" name="league_id" value={leagueId} />
            <label className="block">
              <span className="text-sm font-black uppercase tracking-wide text-slate-300">Nombre visible</span>
              <input
                name="display_name"
                required
                minLength={2}
                maxLength={32}
                defaultValue={profile.display_name}
                className="field mt-2"
              />
            </label>

            <div>
              <div className="text-sm font-black uppercase tracking-wide text-slate-300">Icono</div>
              <div className="mt-3 max-h-72 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-3">
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
                  <label className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black has-[:checked]:border-[#27e7ff] has-[:checked]:bg-[#27e7ff] has-[:checked]:text-black">
                    <input
                      type="radio"
                      name="avatar_emoji"
                      value=""
                      defaultChecked={!profile.avatar_emoji}
                      className="sr-only"
                    />
                    -
                  </label>
                  {PROFILE_AVATAR_EMOJIS.map((emoji) => (
                    <label
                      key={emoji}
                      className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl has-[:checked]:border-[#27e7ff] has-[:checked]:bg-[#27e7ff]"
                    >
                      <input
                        type="radio"
                        name="avatar_emoji"
                        value={emoji}
                        defaultChecked={profile.avatar_emoji === emoji}
                        className="sr-only"
                      />
                      {emoji}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button className="btn-primary">Guardar perfil</button>
          </form>
        </section>

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
