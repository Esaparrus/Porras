import {
  deleteLeagueUserAction,
  resetUserBlockAction,
  resetUserPasswordAction,
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

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [
    { data: members },
    { data: scores },
    { data: matches },
    { data: teams },
    { data: matchPredictions },
    { data: tiebreakSelections },
    { data: scorerPredictions },
    { data: awardPredictions },
    { data: awardRequests },
  ] = await Promise.all([
    supabase
      .from("league_members")
      .select("*, profiles(*)")
      .eq("league_id", leagueId)
      .order("joined_at", { ascending: false }),
    supabase.from("scores").select("*").eq("league_id", leagueId),
    supabase.from("matches").select("*"),
    supabase.from("teams").select("*"),
    supabase
      .from("match_predictions")
      .select("*")
      .eq("league_id", leagueId),
    supabase
      .from("prediction_tiebreak_selections")
      .select("*")
      .eq("league_id", leagueId),
    supabase
      .from("scorer_predictions")
      .select("user_id, player_id")
      .eq("league_id", leagueId),
    supabase
      .from("award_predictions")
      .select("user_id, top_scorer_player_id, best_player_id, best_goalkeeper_id, best_young_player_id")
      .eq("league_id", leagueId),
    supabase
      .from("player_selection_requests")
      .select("user_id, field_key, player_name, status")
      .eq("league_id", leagueId),
  ]);

  const scoreByUserId = new Map(
    ((scores ?? []) as Score[]).map((score) => [score.user_id, score]),
  );
  const matchRows = (matches ?? []) as Match[];
  const teamRows = (teams ?? []) as Team[];
  const groupLetters = Array.from(
    new Set(teamRows.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const totalMatchSlots = matchRows.length;
  const predictionsByUser = groupByUser((matchPredictions ?? []) as MatchPrediction[]);
  const tiebreaksByUser = groupByUser(
    (tiebreakSelections ?? []) as PredictionTiebreakSelection[],
  );
  const scorersByUser = groupByUser(scorerPredictions ?? []);
  const awardsByUser = new Map((awardPredictions ?? []).map((row) => [row.user_id, row]));
  const awardRequestsByUser = groupByUser(
    (awardRequests ?? []).filter((row) => row.status !== "rejected"),
  );

  const normalizedMembers = (members ?? []).map((member) => {
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
    const completedMatches = userMatchPredictions.filter(
      (prediction) =>
        prediction.predicted_home_score !== null &&
        prediction.predicted_away_score !== null,
    ).length;
    const userScorers = scorersByUser.get(member.user_id) ?? [];
    const uniqueScorers = new Set(userScorers.map((prediction) => prediction.player_id));
    const completedScorerSlots = Math.min(3, uniqueScorers.size);
    const userAward = awardsByUser.get(member.user_id);
    const userAwardRequests = awardRequestsByUser.get(member.user_id) ?? [];
    const completedAwardSlots = AWARD_FIELDS.filter((field) => {
      if (userAward?.[field]) return true;
      return userAwardRequests.some(
        (request) => request.field_key === field && request.player_name,
      );
    }).length;

    return {
      ...member,
      profile: profile as Profile | null,
      scoreSummary: getMemberScore(score),
      bets: {
        completed: completedMatches,
        total: totalMatchSlots,
      },
      extras: {
        scorersCompleted: completedScorerSlots,
        scorersTotal: 3,
        awardsCompleted: completedAwardSlots,
        awardsTotal: AWARD_FIELDS.length,
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Usuarios" value={normalizedMembers.length} />
        <StatCard label="Pagados" value={paymentSummary.paid} />
        <StatCard label="Pendientes" value={paymentSummary.pending} />
      </div>

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
                    Goleadores {member.extras.scorersCompleted}/{member.extras.scorersTotal} · Premios {member.extras.awardsCompleted}/{member.extras.awardsTotal}
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
