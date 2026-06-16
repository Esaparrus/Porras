import {
  deleteLeagueUserAction,
  resetUserBlockAction,
  resetUserPasswordAction,
  setCastigosAction,
  updateLeagueMemberPaymentStatusAction,
} from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AdminLayout } from "@/components/layouts";
import { EmptyState, PaymentStatusChip, StatCard } from "@/components/ui";
import { countPayments, formatAdminDate, getMemberScore } from "@/lib/admin";
import { requireAdmin } from "@/lib/data";
import { getManualTiebreakStatus } from "@/lib/prediction-completion";
import type { Match, MatchPrediction, PredictionTiebreakSelection, Profile, Score, Team } from "@/lib/types";

const AWARD_FIELDS = [
  "top_scorer_player_id",
  "best_player_id",
  "best_goalkeeper_id",
  "best_young_player_id",
] as const;
const SUPABASE_PAGE_SIZE = 1000;

type AwardRow = { user_id: string } & Record<(typeof AWARD_FIELDS)[number], string | null>;

type LeagueMemberRow = {
  id: string;
  user_id: string;
  joined_at: string | null;
  payment_status: "paid" | "pending" | null;
  castigo_pending: boolean | null;
  profiles: Profile | Profile[] | null;
};

// Supabase corta cualquier select en 1000 filas por defecto. Todas las tablas que
// crecen con el numero de usuarios (predicciones, goleadores, desempates...) deben
// paginarse o algunos miembros saldrian con datos truncados sin avisar.
async function fetchAllRows<Row>(
  buildPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: unknown }>,
): Promise<Row[]> {
  const rows: Row[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as Row[];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) return rows;
  }
}

function getLeagueMatchPredictions(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  leagueId: string,
) {
  return fetchAllRows<MatchPrediction>((from, to) =>
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId)
      .range(from, to),
  );
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { leagueId } = await params;
  const { notice, error } = await searchParams;
  const { supabase } = await requireAdmin();
  const [
    members,
    scores,
    matches,
    teams,
    tiebreakSelections,
    scorerPredictions,
    awardPredictions,
    awardRequests,
    matchPredictions,
  ] = await Promise.all([
    fetchAllRows<LeagueMemberRow>((from, to) =>
      supabase
        .from("league_members")
        .select("*, profiles(*)")
        .eq("league_id", leagueId)
        .order("joined_at", { ascending: false })
        .order("user_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<Score>((from, to) =>
      supabase.from("scores").select("*").eq("league_id", leagueId).range(from, to),
    ),
    fetchAllRows<Match>((from, to) =>
      supabase.from("matches").select("*").range(from, to),
    ),
    fetchAllRows<Team>((from, to) =>
      supabase.from("teams").select("*").range(from, to),
    ),
    fetchAllRows<PredictionTiebreakSelection>((from, to) =>
      supabase
        .from("prediction_tiebreak_selections")
        .select("*")
        .eq("league_id", leagueId)
        .range(from, to),
    ),
    fetchAllRows<{ user_id: string; player_id: string }>((from, to) =>
      supabase
        .from("scorer_predictions")
        .select("user_id, player_id")
        .eq("league_id", leagueId)
        .range(from, to),
    ),
    fetchAllRows<AwardRow>((from, to) =>
      supabase
        .from("award_predictions")
        .select("user_id, top_scorer_player_id, best_player_id, best_goalkeeper_id, best_young_player_id")
        .eq("league_id", leagueId)
        .range(from, to),
    ),
    fetchAllRows<{
      user_id: string;
      field_key: string;
      player_name: string | null;
      status: string;
    }>((from, to) =>
      supabase
        .from("player_selection_requests")
        .select("user_id, field_key, player_name, status")
        .eq("league_id", leagueId)
        .range(from, to),
    ),
    getLeagueMatchPredictions(supabase, leagueId),
  ]);

  const scoreByUserId = new Map(scores.map((score) => [score.user_id, score]));
  const matchRows = matches;
  const teamRows = teams;
  const groupLetters = Array.from(
    new Set(teamRows.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const totalMatchSlots = matchRows.length;
  const groupMatchRows = matchRows.filter((match) => match.stage === "group");
  const groupMatchTotal = groupMatchRows.length;
  const knockoutMatchTotal = totalMatchSlots - groupMatchTotal;
  const matchStageById = new Map(matchRows.map((match) => [match.id, match.stage]));
  const predictionsByUser = groupByUser(matchPredictions);
  const tiebreaksByUser = groupByUser(tiebreakSelections);
  const scorersByUser = groupByUser(scorerPredictions);
  const awardsByUser = new Map(awardPredictions.map((row) => [row.user_id, row]));
  const awardRequestsByUser = groupByUser(
    awardRequests.filter((row) => row.status !== "rejected"),
  );

  const normalizedMembers = members.map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    const score = scoreByUserId.get(member.user_id);
    const userMatchPredictions = predictionsByUser.get(member.user_id) ?? [];
    const manualTiebreakStatus = getManualTiebreakStatus({
      groupLetters,
      matches: matchRows,
      predictions: userMatchPredictions,
      teams: teamRows,
      tiebreakSelections: tiebreaksByUser.get(member.user_id) ?? [],
    });
    let completedGroupMatches = 0;
    let completedKnockoutMatches = 0;
    for (const prediction of userMatchPredictions) {
      if (
        prediction.predicted_home_score === null ||
        prediction.predicted_away_score === null
      ) {
        continue;
      }
      if (matchStageById.get(prediction.match_id) === "group") {
        completedGroupMatches += 1;
      } else {
        completedKnockoutMatches += 1;
      }
    }
    const completedMatches = completedGroupMatches + completedKnockoutMatches;
    const userScorers = scorersByUser.get(member.user_id) ?? [];
    const uniqueScorers = new Set(userScorers.map((prediction) => prediction.player_id));
    const completedScorerSlots = Math.min(3, uniqueScorers.size);
    const userAward = awardsByUser.get(member.user_id);
    const userAwardRequests = awardRequestsByUser.get(member.user_id) ?? [];
    // Solo cuenta como hecho lo confirmado: el valor en award_predictions (que se
    // escribe al aprobar una peticion manual). Las peticiones aun pendientes de
    // revisar se reportan aparte para no inflar el "X/4".
    const completedAwardSlots = AWARD_FIELDS.filter((field) =>
      Boolean(userAward?.[field]),
    ).length;
    const pendingAwardSlots = AWARD_FIELDS.filter((field) => {
      if (userAward?.[field]) return false;
      return userAwardRequests.some(
        (request) =>
          request.field_key === field &&
          request.player_name &&
          request.status === "pending",
      );
    }).length;

    return {
      ...member,
      profile: profile as Profile | null,
      scoreSummary: getMemberScore(score),
      bets: {
        completed: completedMatches,
        total: totalMatchSlots,
        groupCompleted: completedGroupMatches,
        groupTotal: groupMatchTotal,
        knockoutCompleted: completedKnockoutMatches,
        knockoutTotal: knockoutMatchTotal,
      },
      extras: {
        scorersCompleted: completedScorerSlots,
        scorersTotal: 3,
        awardsCompleted: completedAwardSlots,
        awardsTotal: AWARD_FIELDS.length,
        awardsPending: pendingAwardSlots,
      },
      pendingManualTiebreaks: manualTiebreakStatus.pendingCount,
    };
  });

  const paymentSummary = countPayments(
    normalizedMembers.map((member) => member.payment_status ?? "pending"),
  );

  return (
    <AdminLayout leagueId={leagueId}>
      <h1 className="text-3xl font-black">Usuarios</h1>
      <p className="mt-2 text-sm text-slate-300">
        Quien se ha unido, cuando entro y si ya ha pagado la liga.
      </p>

      {error ? (
        <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Usuarios" value={normalizedMembers.length} />
        <StatCard label="Pagados" value={paymentSummary.paid} />
        <StatCard label="Pendientes" value={paymentSummary.pending} />
      </div>

      {normalizedMembers.length ? (
        <details className="glass mt-6 overflow-hidden rounded-2xl">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 marker:hidden">
            <div className="min-w-0">
              <h2 className="text-lg font-black">😈 Castigos</h2>
              <p className="text-sm text-slate-300">
                Elige a quién le salta la pizarra al entrar a la liga.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
              {normalizedMembers.filter((m) => m.castigo_pending).length} activo(s)
            </span>
          </summary>
          <form action={setCastigosAction} className="border-t border-white/10 p-4">
            <input type="hidden" name="league_id" value={leagueId} />
            <div className="grid gap-2 sm:grid-cols-2">
              {normalizedMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    name="castigo_user"
                    value={member.user_id}
                    defaultChecked={Boolean(member.castigo_pending)}
                    className="h-5 w-5 accent-[#ff2bd6]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">
                      {member.profile?.display_name ?? "Jugador"}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      @{member.profile?.username ?? "sin-usuario"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Marca a quién quieres castigar y guarda. Los que desmarques dejan de
              tener castigo.
            </p>
            <button className="btn-primary mt-3">Guardar castigos</button>
          </form>
        </details>
      ) : null}

      <div className="mt-6 grid gap-4">
        {normalizedMembers.length ? (
          normalizedMembers.map((member) => (
            <details key={member.id} className="glass overflow-hidden rounded-2xl">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 marker:hidden">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black">
                    {member.profile?.display_name ?? "Jugador"}
                  </h2>
                  <p className="text-sm text-slate-300">
                    @{member.profile?.username ?? "sin-usuario"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PaymentStatusChip status={member.payment_status ?? "pending"} />
                  <div className="rounded-full bg-black/25 px-3 py-1 text-sm font-black text-[#ff2bd6]">
                    {member.scoreSummary.total} pts
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
                    Ver acciones
                  </span>
                </div>
              </summary>

              <div className="border-t border-white/10 px-4 pb-4 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Unido a la liga: {formatAdminDate(member.joined_at)}
                </p>

                <div className="mt-4 rounded-2xl bg-black/20 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Apuestas hechas
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {member.bets.completed}/{member.bets.total}
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-300">
                    Grupos {member.bets.groupCompleted}/{member.bets.groupTotal} · Eliminatorias {member.bets.knockoutCompleted}/{member.bets.knockoutTotal}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-300">
                    Goleadores {member.extras.scorersCompleted}/{member.extras.scorersTotal} · Premios {member.extras.awardsCompleted}/{member.extras.awardsTotal}
                    {member.extras.awardsPending
                      ? ` (${member.extras.awardsPending} pendiente(s) de aprobar)`
                      : ""}
                  </p>
                  {member.pendingManualTiebreaks ? (
                    <p className="mt-2 text-xs font-bold text-[#ffcf9f]">
                      Tiene {member.pendingManualTiebreaks} desempate(s) manual(es) pendiente(s).
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={updateLeagueMemberPaymentStatusAction}>
                    <input type="hidden" name="league_id" value={leagueId} />
                    <input type="hidden" name="target_user_id" value={member.user_id} />
                    <input
                      type="hidden"
                      name="payment_status"
                      value={member.payment_status === "paid" ? "pending" : "paid"}
                    />
                    <button
                      className={
                        member.payment_status === "paid"
                          ? "btn-danger py-2"
                          : "btn-primary py-2"
                      }
                    >
                      {member.payment_status === "paid"
                        ? "Marcar pendiente"
                        : "Marcar pagado"}
                    </button>
                  </form>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Resets admin
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <form action={resetUserPasswordAction}>
                      <input type="hidden" name="league_id" value={leagueId} />
                      <input type="hidden" name="target_user_id" value={member.user_id} />
                      <ConfirmSubmitButton
                        className="btn-danger py-2"
                        confirmMessage={`Vas a cambiar la contrasena de @${member.profile?.username ?? "sin-usuario"} a "paquete". Quieres seguir?`}
                      >
                        Poner contrasena por defecto: paquete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["matches", "scorers", "awards", "knockouts", "all"].map((block) => (
                      <form key={block} action={resetUserBlockAction}>
                        <input type="hidden" name="league_id" value={leagueId} />
                        <input type="hidden" name="target_user_id" value={member.user_id} />
                        <input type="hidden" name="block" value={block} />
                        <button
                          className={
                            block === "all" ? "btn-danger py-2" : "btn-secondary py-2"
                          }
                        >
                          Reset {block}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Usuario
                  </div>
                  <form action={deleteLeagueUserAction}>
                    <input type="hidden" name="league_id" value={leagueId} />
                    <input type="hidden" name="target_user_id" value={member.user_id} />
                    <ConfirmSubmitButton
                      className="btn-danger py-2"
                      confirmMessage={`Vas a eliminar a @${member.profile?.username ?? "sin-usuario"} de esta liga. Tambien se borraran sus apuestas y puntuacion de esta liga. Quieres seguir?`}
                    >
                      Eliminar usuario de la liga
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            </details>
          ))
        ) : (
          <EmptyState
            title="Todavia no hay usuarios"
            text="Cuando alguien entre con el codigo de la liga aparecera aqui para gestionar su pago."
          />
        )}
      </div>
    </AdminLayout>
  );
}

function groupByUser<Row extends { user_id: string }>(rows: Row[]) {
  return rows.reduce<Map<string, Row[]>>((groups, row) => {
    groups.set(row.user_id, [...(groups.get(row.user_id) ?? []), row]);
    return groups;
  }, new Map());
}
