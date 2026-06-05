"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_POINT_SETTINGS } from "@/lib/constants";
import { requireAdmin, requireUser } from "@/lib/data";
import {
  BEST_THIRD_SCOPE_KEY,
  buildManualRankMap,
  buildTiebreakRows,
} from "@/lib/prediction-tiebreaks";
import {
  calculateAllMatchPointsForUser,
  calculateAwardPoints,
  calculateBestThirdPlacedTeams,
  calculateGroupPredictionPoints,
  calculateLiveKnockoutMatchPoints,
  calculatePredictedGroupStandings,
  calculateRealGroupStandings,
  calculateScorerPoints,
  calculateTotalUserScore,
  withDefaultSettings,
} from "@/lib/scoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Match,
  MatchPrediction,
  PointSettings,
  PredictionTiebreakSelection,
} from "@/lib/types";
import { generateKnockoutFromResults, getMatchWinner } from "@/lib/world-cup";
import {
  authEmailForUsername,
  generateLeagueCode,
  isValidUsername,
  nullableNumberFromForm,
  normalizeUsername,
  numberFromForm,
} from "@/lib/utils";

const AWARD_REQUEST_FIELDS = [
  "top_scorer_player_id",
  "best_player_id",
  "best_goalkeeper_id",
  "best_young_player_id",
] as const;
const DEFAULT_RESET_PASSWORD = "paquete";
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
] as const;

type AwardRequestField = (typeof AWARD_REQUEST_FIELDS)[number];
type PredictionLockKey = "lock_matches" | "lock_scorers" | "lock_awards" | "lock_knockouts";

async function assertPredictionsOpen(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  leagueId: string,
  lockKeys: PredictionLockKey[],
) {
  const { data: league } = await supabase
    .from("leagues")
    .select("status, lock_matches, lock_scorers, lock_awards, lock_knockouts")
    .eq("id", leagueId)
    .maybeSingle();

  if (
    !league ||
    league.status !== "open" ||
    lockKeys.some((key) => Boolean(league[key]))
  ) {
    throw new Error("Las apuestas estan bloqueadas.");
  }
}

function isAwardRequestField(value: string): value is AwardRequestField {
  return AWARD_REQUEST_FIELDS.includes(value as AwardRequestField);
}

function readPlayerSelection(
  formData: FormData,
  key: AwardRequestField,
): { playerId: string | null; manualName: string | null; teamId: string | null } {
  const mode = String(formData.get(`${key}_mode`) ?? "select");
  if (mode === "manual") {
    const manualName = String(formData.get(`${key}_manual_name`) ?? "").trim();
    const teamId = String(formData.get(`${key}_manual_team_id`) ?? "") || null;
    return {
      playerId: null,
      manualName: manualName || null,
      teamId,
    };
  }

  return {
    playerId: String(formData.get(key) ?? "") || null,
    manualName: null,
    teamId: null,
  };
}

export async function loginAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");

  let email = username;
  if (!username.includes("@")) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("username", username)
      .maybeSingle();

    if (!profile?.email) redirect("/login?error=Credenciales incorrectas");
    email = profile.email;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Credenciales incorrectas");
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function registerAction(formData: FormData) {
  const admin = createSupabaseAdminClient();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("league_code") ?? "").trim().toUpperCase();

  if (!isValidUsername(username)) {
    redirect("/register?error=El usuario debe tener 3-24 caracteres: letras, números, punto, guion o guion bajo");
  }

  if (password.length < 4) {
    redirect("/register?error=La contraseña debe tener al menos 4 caracteres");
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) redirect("/register?error=Ese usuario ya está ocupado");

  const { data: league } = await admin
    .from("leagues")
    .select("id")
    .eq("code", code)
    .single();

  if (!league) redirect("/register?error=El código de liga no existe");

  const email = authEmailForUsername(username);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: username, username },
  });
  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already")) {
      redirect("/register?error=Ese usuario ya está ocupado");
    }
    redirect(`/register?error=${encodeURIComponent(error?.message ?? "No se pudo crear el usuario")}`);
  }

  await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    username,
    display_name: username,
    role: "player",
  });
  await admin.from("league_members").insert({
    league_id: league.id,
    user_id: data.user.id,
  });
  await admin.from("scores").upsert({
    league_id: league.id,
    user_id: data.user.id,
  });

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect(`/league/${league.id}`);
}

export async function createLeagueAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const name = String(formData.get("name") ?? "").trim();
  let code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) code = generateLeagueCode(name);

  const { data: league, error } = await supabase
    .from("leagues")
    .insert({ name, code })
    .select("*")
    .single();
  if (error || !league) redirect("/admin/leagues/new?error=No se pudo crear la liga");

  await supabase
    .from("league_point_settings")
    .insert({ league_id: league.id, ...DEFAULT_POINT_SETTINGS });
  await supabase.from("admin_logs").insert({
    league_id: league.id,
    admin_user_id: user.id,
    action_type: "create_league",
    description: `Liga creada: ${name}`,
  });
  redirect(`/admin/leagues/${league.id}`);
}

export async function deleteLeagueAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id") ?? "");

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("id", leagueId)
    .maybeSingle();

  if (!league) {
    redirect("/admin/leagues?error=La liga no existe");
  }

  await supabase.from("admin_logs").insert({
    league_id: league.id,
    admin_user_id: user.id,
    action_type: "delete_league",
    description: `Liga eliminada: ${league.name}`,
  });

  const { error } = await supabase.from("leagues").delete().eq("id", league.id);
  if (error) {
    redirect("/admin/leagues?error=No se pudo eliminar la liga");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/leagues");
  redirect("/admin/leagues");
}

export async function updateLeagueSettingsAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const payload: Record<string, number | string> = { league_id: leagueId };

  Object.keys(DEFAULT_POINT_SETTINGS).forEach((key) => {
    payload[key] = numberFromForm(formData, key);
  });

  await supabase.from("league_point_settings").upsert(payload, {
    onConflict: "league_id",
  });
  await supabase
    .from("leagues")
    .update({
      entry_price: numberFromForm(formData, "entry_price"),
      pot_total_override: nullableNumberFromForm(formData, "pot_total_override"),
      prize_first_percentage: numberFromForm(formData, "prize_first_percentage"),
      prize_second_percentage: numberFromForm(formData, "prize_second_percentage"),
      prize_third_percentage: numberFromForm(formData, "prize_third_percentage"),
    })
    .eq("id", leagueId);
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    action_type: "update_points",
    description: "Puntuación y bote actualizados correctamente",
  });
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}/settings`);
  revalidatePath(`/admin/leagues/${leagueId}/ranking`);
  revalidatePath(`/admin/leagues/${leagueId}/users`);
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/ranking`);
  revalidatePath(`/league/${leagueId}/profile`);
}

export async function updateLeagueLocksAction(formData: FormData) {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const nextStatus = String(formData.get("status"));
  const nextLocks = {
    predictions_visible: formData.get("predictions_visible") === "on",
    lock_matches: formData.get("lock_matches") === "on",
    lock_scorers: formData.get("lock_scorers") === "on",
    lock_awards: formData.get("lock_awards") === "on",
    lock_knockouts: formData.get("lock_knockouts") === "on",
  };

  if (
    nextStatus !== "open" &&
    nextLocks.lock_matches &&
    nextLocks.lock_scorers &&
    nextLocks.lock_awards &&
    nextLocks.lock_knockouts
  ) {
    const pendingMessage = await getLeaguePredictionPendingMessage(leagueId);
    if (pendingMessage) {
      redirect(
        `/admin/leagues/${leagueId}/settings?warning=${encodeURIComponent(pendingMessage)}`,
      );
    }
  }

  await supabase
    .from("leagues")
    .update({
      status: nextStatus,
      predictions_visible: nextLocks.predictions_visible,
      lock_matches: nextLocks.lock_matches,
      lock_scorers: nextLocks.lock_scorers,
      lock_awards: nextLocks.lock_awards,
      lock_knockouts: nextLocks.lock_knockouts,
    })
    .eq("id", leagueId);
  revalidatePath(`/admin/leagues/${leagueId}`);
  revalidatePath(`/admin/leagues/${leagueId}/settings`);
}

export async function checkLeaguePredictionProgressAction(formData: FormData) {
  await requireAdmin();
  const leagueId = String(formData.get("league_id"));
  const pendingMessage = await getLeaguePredictionPendingMessage(leagueId);

  if (pendingMessage) {
    redirect(
      `/admin/leagues/${leagueId}/settings?warning=${encodeURIComponent(pendingMessage)}`,
    );
  }

  redirect(
    `/admin/leagues/${leagueId}/settings?notice=${encodeURIComponent("Todos tienen sus apuestas completas ahora mismo.")}`,
  );
}

async function getLeaguePredictionPendingMessage(leagueId: string) {
  const supabase = createSupabaseAdminClient();
  const [
    { data: members },
    { data: matches },
    { data: matchPredictions },
    { data: scorerPredictions },
    { data: awardPredictions },
    { data: awardRequests },
  ] = await Promise.all([
    supabase
      .from("league_members")
      .select("user_id, profiles(display_name, username)")
      .eq("league_id", leagueId),
    supabase.from("matches").select("id, stage"),
    supabase
      .from("match_predictions")
      .select("user_id, match_id, predicted_home_score, predicted_away_score, predicted_winner_team_id")
      .eq("league_id", leagueId),
    supabase
      .from("scorer_predictions")
      .select("user_id, player_id, is_captain")
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

  const matchRows = matches ?? [];
  const totalMatches = matchRows.length;
  const knockoutMatchIds = new Set(
    matchRows.filter((match) => match.stage !== "group").map((match) => match.id),
  );
  const predictionsByUser = groupByUser(matchPredictions ?? []);
  const scorersByUser = groupByUser(scorerPredictions ?? []);
  const awardsByUser = new Map(
    (awardPredictions ?? []).map((row) => [row.user_id, row]),
  );
  const awardRequestsByUser = groupByUser(
    (awardRequests ?? []).filter((row) => row.status !== "rejected"),
  );

  const pendingLines = (members ?? [])
    .map((member) => {
      const userId = member.user_id;
      const userMatchPredictions = predictionsByUser.get(userId) ?? [];
      const completedMatchIds = new Set(
        userMatchPredictions
          .filter(
            (prediction) =>
              prediction.predicted_home_score !== null &&
              prediction.predicted_away_score !== null,
          )
          .map((prediction) => prediction.match_id),
      );
      const tiedKnockoutsWithoutWinner = userMatchPredictions.filter(
        (prediction) =>
          knockoutMatchIds.has(prediction.match_id) &&
          prediction.predicted_home_score !== null &&
          prediction.predicted_away_score !== null &&
          prediction.predicted_home_score === prediction.predicted_away_score &&
          !prediction.predicted_winner_team_id,
      ).length;
      const missingMatches =
        Math.max(0, totalMatches - completedMatchIds.size) + tiedKnockoutsWithoutWinner;

      const userScorers = scorersByUser.get(userId) ?? [];
      const uniqueScorers = new Set(userScorers.map((prediction) => prediction.player_id));
      const hasCaptain = userScorers.some((prediction) => prediction.is_captain);
      const missingScorers = Math.max(0, 3 - uniqueScorers.size) + (hasCaptain ? 0 : 1);

      const userAward = awardsByUser.get(userId);
      const userAwardRequests = awardRequestsByUser.get(userId) ?? [];
      const missingAwards = AWARD_REQUEST_FIELDS.filter((field) => {
        if (userAward?.[field]) return false;
        return !userAwardRequests.some(
          (request) => request.field_key === field && request.player_name,
        );
      }).length;

      const pendingParts = [
        missingMatches ? `${missingMatches} resultados` : "",
        missingScorers ? `${missingScorers} goleadores/capitan` : "",
        missingAwards ? `${missingAwards} premios` : "",
      ].filter(Boolean);

      if (!pendingParts.length) return null;

      const profile = Array.isArray(member.profiles)
        ? member.profiles[0]
        : member.profiles;
      const displayName = profile?.display_name || profile?.username || "Un usuario";
      return `${displayName} le queda por completar ${pendingParts.join(", ")}`;
    })
    .filter(Boolean);

  if (!pendingLines.length) return "";
  return `${pendingLines.join(". ")}. Avisale antes de comenzar la liga.`;
}

function groupByUser<Row extends { user_id: string }>(rows: Row[]) {
  return rows.reduce<Map<string, Row[]>>((groups, row) => {
    groups.set(row.user_id, [...(groups.get(row.user_id) ?? []), row]);
    return groups;
  }, new Map());
}

export async function saveMatchPredictionsAction(formData: FormData) {
  const { user } = await requireUser();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  await assertPredictionsOpen(supabase, leagueId, ["lock_matches", "lock_knockouts"]);
  const matchIds = String(formData.get("match_ids") ?? "")
    .split(",")
    .filter(Boolean);

  const rows = matchIds.map((matchId) => ({
    league_id: leagueId,
    user_id: user.id,
    match_id: matchId,
    predicted_home_score: nullableNumberFromForm(formData, `home_${matchId}`),
    predicted_away_score: nullableNumberFromForm(formData, `away_${matchId}`),
    predicted_winner_team_id:
      String(formData.get(`winner_${matchId}`) ?? "") || null,
  }));

  await supabase.from("match_predictions").upsert(rows, {
    onConflict: "league_id,user_id,match_id",
  });
  const tiebreakDraft = JSON.parse(
    String(formData.get("tiebreak_selections") ?? "{}"),
  ) as Record<string, string[]>;
  await supabase
    .from("prediction_tiebreak_selections")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", user.id);
  const tiebreakRows = buildTiebreakRows(leagueId, user.id, tiebreakDraft);
  if (tiebreakRows.length) {
    await supabase.from("prediction_tiebreak_selections").insert(tiebreakRows);
  }
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/league/${leagueId}/predictions`);
  return { ok: true, savedAt: new Date().toISOString(), userId: user.id };
}

export async function saveScorerPredictionsAction(formData: FormData) {
  const { user } = await requireUser();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  await assertPredictionsOpen(supabase, leagueId, ["lock_scorers"]);
  const playerIds = ["player_1", "player_2", "player_3"]
    .map((key) => String(formData.get(key) ?? ""))
    .filter(Boolean);
  const captainId = String(formData.get("captain_id") ?? "");

  await supabase
    .from("scorer_predictions")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", user.id);

  if (playerIds.length) {
    await supabase.from("scorer_predictions").insert(
      playerIds.map((playerId) => ({
        league_id: leagueId,
        user_id: user.id,
        player_id: playerId,
        is_captain: playerId === captainId,
      })),
    );
  }
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/league/${leagueId}/predictions`);
}

export async function saveAwardPredictionsAction(formData: FormData) {
  const { user } = await requireUser();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  await assertPredictionsOpen(supabase, leagueId, ["lock_awards"]);

  const selections = Object.fromEntries(
    AWARD_REQUEST_FIELDS.map((field) => [field, readPlayerSelection(formData, field)]),
  ) as Record<AwardRequestField, ReturnType<typeof readPlayerSelection>>;

  await supabase.from("award_predictions").upsert(
    {
      league_id: leagueId,
      user_id: user.id,
      top_scorer_player_id: selections.top_scorer_player_id.playerId,
      best_player_id: selections.best_player_id.playerId,
      best_goalkeeper_id: selections.best_goalkeeper_id.playerId,
      best_young_player_id: selections.best_young_player_id.playerId,
    },
    { onConflict: "league_id,user_id" },
  );

  await supabase
    .from("player_selection_requests")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", user.id);

  const manualRequests = AWARD_REQUEST_FIELDS.flatMap((field) => {
    const selection = selections[field];
    if (!selection.manualName) return [];

    return [
      {
        league_id: leagueId,
        user_id: user.id,
        field_key: field,
        player_name: selection.manualName,
        team_id: selection.teamId,
        status: "pending",
      },
    ];
  });

  if (manualRequests.length) {
    await supabase.from("player_selection_requests").insert(manualRequests);
  }

  await recalculateLeagueScores(leagueId);
  revalidatePath(`/league/${leagueId}/predictions`);
}

export async function updateMatchResultAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const matchId = String(formData.get("match_id"));
  await supabase
    .from("matches")
    .update({
      home_score: nullableNumberFromForm(formData, "home_score"),
      away_score: nullableNumberFromForm(formData, "away_score"),
      winner_team_id: String(formData.get("winner_team_id") ?? "") || null,
      is_finished: formData.get("is_finished") === "on",
    })
    .eq("id", matchId);
  await generateKnockoutFromResults(supabase);
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    action_type: "update_result",
    description: "Resultado actualizado",
  });
  await recalculateAllLeagueScores();
  revalidatePath(`/admin/leagues/${leagueId}`);
  revalidatePath(`/admin/leagues/${leagueId}/matches`);
  revalidatePath(`/admin/leagues/${leagueId}/daily`);
  revalidatePath(`/admin/leagues/${leagueId}/ranking`);
  revalidatePath("/admin");
  revalidatePath("/admin/results");
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/ranking`);
  revalidatePath(`/league/${leagueId}/predictions`);
}

export async function quickGoalAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const playerId = String(formData.get("player_id"));
  const delta = numberFromForm(formData, "delta");

  const { data: existing } = await supabase
    .from("league_player_goals")
    .select("*")
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .maybeSingle();

  const nextGoals = Math.max(0, (existing?.goals ?? 0) + delta);

  await syncAllLeaguesPlayerGoalValue(supabase, playerId, nextGoals);
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    action_type: "quick_goal",
    description: `Goles actualizados para jugador ${playerId}`,
  });
  await recalculateAllLeagueScores();
  revalidatePath(`/admin/leagues/${leagueId}/scorers`);
  revalidatePath(`/admin/leagues/${leagueId}/daily`);
  revalidatePath(`/admin/leagues/${leagueId}/ranking`);
  revalidatePath("/admin/results");
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/ranking`);
}

export async function setAdminScorerGoalsAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const playerId = String(formData.get("player_id") ?? "");
  const goals = Math.max(0, numberFromForm(formData, "goals"));

  if (!playerId) return;

  await syncAllLeaguesPlayerGoalValue(supabase, playerId, goals);
  await supabase.from("admin_logs").insert({
    league_id: null,
    admin_user_id: user.id,
    action_type: "set_scorer_goals",
    description: `Total manual de goles actualizado para jugador ${playerId}`,
  });
  await recalculateAllLeagueScores();
  revalidatePath("/admin/results");
}

export async function saveAdminMatchBundleAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const matchId = String(formData.get("match_id"));
  const homeScore = nullableNumberFromForm(formData, "home_score");
  const awayScore = nullableNumberFromForm(formData, "away_score");
  const isFinished = formData.get("is_finished") === "on";
  const winnerTeamId = String(formData.get("winner_team_id") ?? "") || null;
  const homeScorers = formData
    .getAll("home_scorer_player_id")
    .map((value) => String(value))
    .filter(Boolean);
  const awayScorers = formData
    .getAll("away_scorer_player_id")
    .map((value) => String(value))
    .filter(Boolean);
  const submittedScorerIds = Array.from(new Set([...homeScorers, ...awayScorers]));
  const { data: match } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();

  let validHomeScorers = homeScorers;
  let validAwayScorers = awayScorers;

  if (submittedScorerIds.length) {
    const [{ data: pickedRows }, { data: playerRows }] = await Promise.all([
      supabase.from("scorer_predictions").select("player_id").in("player_id", submittedScorerIds),
      supabase.from("players").select("id, team_id").in("id", submittedScorerIds),
    ]);
    const pickedIds = new Set((pickedRows ?? []).map((row) => row.player_id));
    const teamByPlayerId = new Map((playerRows ?? []).map((row) => [row.id, row.team_id]));

    validHomeScorers = homeScorers.filter(
      (playerId) =>
        pickedIds.has(playerId) &&
        Boolean(match?.home_team_id) &&
        teamByPlayerId.get(playerId) === match?.home_team_id,
    );
    validAwayScorers = awayScorers.filter(
      (playerId) =>
        pickedIds.has(playerId) &&
        Boolean(match?.away_team_id) &&
        teamByPlayerId.get(playerId) === match?.away_team_id,
    );
  }

  await supabase
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: winnerTeamId,
      is_finished: isFinished,
    })
    .eq("id", matchId);

  await supabase.from("match_scorers").delete().eq("match_id", matchId);

  const scorerTotals = new Map<string, number>();
  [...validHomeScorers, ...validAwayScorers].forEach((playerId) => {
    scorerTotals.set(playerId, (scorerTotals.get(playerId) ?? 0) + 1);
  });

  if (scorerTotals.size) {
    await supabase.from("match_scorers").insert(
      Array.from(scorerTotals.entries()).map(([playerId, goals]) => ({
        match_id: matchId,
        player_id: playerId,
        goals,
      })),
    );
  }

  await syncLeagueGoalTotalsFromMatchScorers(supabase);
  await generateKnockoutFromResults(supabase);

  await supabase.from("admin_logs").insert({
    league_id: null,
    admin_user_id: user.id,
    action_type: "update_result_bundle",
    description: `Resultado y goleadores guardados para partido ${matchId}`,
  });

  await recalculateAllLeagueScores();
  revalidatePath("/admin");
  revalidatePath("/admin/results");
}

export async function clearAdminMatchBundleAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const matchId = String(formData.get("match_id") ?? "");

  if (!matchId) return;

  await supabase
    .from("matches")
    .update({
      home_score: null,
      away_score: null,
      winner_team_id: null,
      is_finished: false,
    })
    .eq("id", matchId);

  await supabase.from("match_scorers").delete().eq("match_id", matchId);
  await syncLeagueGoalTotalsFromMatchScorers(supabase);
  await generateKnockoutFromResults(supabase);

  await supabase.from("admin_logs").insert({
    league_id: null,
    admin_user_id: user.id,
    action_type: "clear_result_bundle",
    description: `Resultado eliminado para partido ${matchId}`,
  });

  await recalculateAllLeagueScores();
  revalidatePath("/admin");
  revalidatePath("/admin/results");
}

export async function saveGroupManualOrderAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const groupLetter = String(formData.get("group_letter") ?? "").trim().toUpperCase();
  const teamIds = String(formData.get("team_ids") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!groupLetter || !teamIds.length) return;

  await Promise.all(
    teamIds.map((teamId, index) =>
      supabase
        .from("teams")
        .update({ manual_order: index + 1 })
        .eq("id", teamId)
        .eq("group_letter", groupLetter),
    ),
  );

  await generateKnockoutFromResults(supabase);
  await supabase.from("admin_logs").insert({
    league_id: null,
    admin_user_id: user.id,
    action_type: "update_group_manual_order",
    description: `Orden manual actualizado para grupo ${groupLetter}`,
  });
  await recalculateAllLeagueScores();
  await revalidateAllLeagueViews();
  revalidatePath("/admin");
  revalidatePath("/admin/results");
}

export async function saveFinalAwardsAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  await supabase.from("final_awards").upsert(
    {
      league_id: leagueId,
      top_scorer_player_id: String(formData.get("top_scorer_player_id") ?? "") || null,
      best_player_id: String(formData.get("best_player_id") ?? "") || null,
      best_goalkeeper_id: String(formData.get("best_goalkeeper_id") ?? "") || null,
      best_young_player_id: String(formData.get("best_young_player_id") ?? "") || null,
    },
    { onConflict: "league_id" },
  );
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    action_type: "update_awards",
    description: "Premios finales actualizados",
  });
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}/awards`);
}

export async function resolvePlayerSelectionRequestAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const requestId = String(formData.get("request_id"));
  const resolvedPlayerId = String(formData.get("resolved_player_id") ?? "") || null;

  if (!resolvedPlayerId) return;

  const { data: request } = await supabase
    .from("player_selection_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || !isAwardRequestField(request.field_key)) return;

  await supabase
    .from("award_predictions")
    .upsert(
      {
        league_id: request.league_id,
        user_id: request.user_id,
        [request.field_key]: resolvedPlayerId,
      },
      { onConflict: "league_id,user_id" },
    );

  await supabase
    .from("player_selection_requests")
    .update({
      status: "approved",
      resolved_player_id: resolvedPlayerId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", requestId);

  await recalculateLeagueScores(request.league_id);
  revalidatePath("/admin/results");
  revalidatePath(`/league/${request.league_id}/predictions`);
}

export async function rejectPlayerSelectionRequestAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const requestId = String(formData.get("request_id"));

  await supabase
    .from("player_selection_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      resolved_player_id: null,
    })
    .eq("id", requestId);

  revalidatePath("/admin/results");
}

export async function resetUserBlockAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const targetUserId = String(formData.get("target_user_id"));
  const block = String(formData.get("block"));
  const tables: Record<string, string[]> = {
    matches: ["match_predictions"],
    scorers: ["scorer_predictions"],
    awards: ["award_predictions"],
    knockouts: ["knockout_predictions"],
    all: [
      "match_predictions",
      "scorer_predictions",
      "award_predictions",
      "knockout_predictions",
    ],
  };

  for (const table of tables[block] ?? []) {
    await supabase
      .from(table)
      .delete()
      .eq("league_id", leagueId)
      .eq("user_id", targetUserId);
  }
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    target_user_id: targetUserId,
    action_type: "reset_predictions",
    description: `Reset de apuestas: ${block}`,
  });
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}/users`);
}

export async function resetUserPasswordAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const targetUserId = String(formData.get("target_user_id"));

  const { data: membership } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!membership) {
    redirect(`/admin/leagues/${leagueId}/users?error=Usuario no encontrado en esta liga`);
  }

  const { error } = await supabase.auth.admin.updateUserById(targetUserId, {
    password: DEFAULT_RESET_PASSWORD,
  });

  if (error) {
    redirect(`/admin/leagues/${leagueId}/users?error=No se pudo resetear la contrasena`);
  }

  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    target_user_id: targetUserId,
    action_type: "reset_password",
    description: `Contrasena reseteada a ${DEFAULT_RESET_PASSWORD}`,
  });

  revalidatePath(`/admin/leagues/${leagueId}/users`);
}

export async function recalculateLeagueScoresAction(formData: FormData) {
  await requireAdmin();
  const leagueId = String(formData.get("league_id"));
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}/ranking`);
}

export async function updateOwnLeaguePaymentStatusAction(formData: FormData) {
  const { user } = await requireUser();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const paymentStatus =
    String(formData.get("payment_status")) === "paid" ? "paid" : "pending";

  await supabase
    .from("league_members")
    .update({ payment_status: paymentStatus })
    .eq("league_id", leagueId)
    .eq("user_id", user.id);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/ranking`);
  revalidatePath(`/league/${leagueId}/profile`);
  revalidatePath(`/admin/leagues/${leagueId}/users`);
}

export async function updateOwnProfileAction(formData: FormData) {
  const { user } = await requireUser();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatarEmoji = String(formData.get("avatar_emoji") ?? "").trim();

  if (displayName.length < 2 || displayName.length > 32) {
    redirect(`/league/${leagueId}/profile?error=El nombre debe tener entre 2 y 32 caracteres`);
  }

  const normalizedAvatarEmoji =
    avatarEmoji && PROFILE_AVATAR_EMOJIS.includes(avatarEmoji as (typeof PROFILE_AVATAR_EMOJIS)[number])
      ? avatarEmoji
      : null;

  await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_emoji: normalizedAvatarEmoji,
    })
    .eq("id", user.id);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/ranking`);
  revalidatePath(`/league/${leagueId}/profile`);
  revalidatePath(`/admin/leagues/${leagueId}/ranking`);
  revalidatePath(`/admin/leagues/${leagueId}/users`);
  redirect(`/league/${leagueId}/profile?saved=profile`);
}

export async function updateLeagueMemberPaymentStatusAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  const targetUserId = String(formData.get("target_user_id"));
  const paymentStatus =
    String(formData.get("payment_status")) === "paid" ? "paid" : "pending";

  await supabase
    .from("league_members")
    .update({ payment_status: paymentStatus })
    .eq("league_id", leagueId)
    .eq("user_id", targetUserId);
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    target_user_id: targetUserId,
    action_type: "update_payment_status",
    description: `Estado de pago cambiado a ${paymentStatus}`,
  });

  revalidatePath(`/admin/leagues/${leagueId}/users`);
  revalidatePath(`/admin/leagues/${leagueId}/ranking`);
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/ranking`);
  revalidatePath(`/league/${leagueId}/profile`);
}

async function getAllLeagueIds() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("leagues").select("id");
  return (data ?? []).map((league) => league.id);
}

async function syncAllLeaguesPlayerGoalValue(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  playerId: string,
  goals: number,
) {
  const { data: leagues } = await supabase.from("leagues").select("id");
  const leagueIds = (leagues ?? []).map((league) => league.id);

  for (const currentLeagueId of leagueIds) {
    await supabase.from("league_player_goals").upsert(
      {
        league_id: currentLeagueId,
        player_id: playerId,
        goals,
        manual_goals_override: goals,
      },
      { onConflict: "league_id,player_id" },
    );
  }
}

async function syncLeagueGoalTotalsFromMatchScorers(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
) {
  const [{ data: leagues }, { data: scorerRows }] = await Promise.all([
    supabase.from("leagues").select("id"),
    supabase.from("match_scorers").select("player_id, goals"),
  ]);

  const totals = new Map<string, number>();
  (scorerRows ?? []).forEach((row) => {
    totals.set(row.player_id, (totals.get(row.player_id) ?? 0) + row.goals);
  });

  for (const league of leagues ?? []) {
    const { data: existingGoalRows } = await supabase
      .from("league_player_goals")
      .select("player_id, manual_goals_override")
      .eq("league_id", league.id);
    const manualOverrides = new Map(
      (existingGoalRows ?? [])
        .filter((row) => row.manual_goals_override !== null)
        .map((row) => [row.player_id, row.manual_goals_override as number]),
    );

    await supabase.from("league_player_goals").delete().eq("league_id", league.id);

    const playerIds = new Set([...totals.keys(), ...manualOverrides.keys()]);

    if (playerIds.size) {
      await supabase.from("league_player_goals").insert(
        Array.from(playerIds).map((playerId) => ({
          league_id: league.id,
          player_id: playerId,
          goals: manualOverrides.get(playerId) ?? totals.get(playerId) ?? 0,
          manual_goals_override: manualOverrides.get(playerId) ?? null,
        })),
      );
    }
  }
}

async function revalidateAllLeagueViews() {
  const leagueIds = await getAllLeagueIds();
  revalidatePath("/admin");
  revalidatePath("/admin/leagues");
  revalidatePath("/admin/results");

  for (const leagueId of leagueIds) {
    revalidatePath(`/admin/leagues/${leagueId}`);
    revalidatePath(`/admin/leagues/${leagueId}/matches`);
    revalidatePath(`/admin/leagues/${leagueId}/scorers`);
    revalidatePath(`/admin/leagues/${leagueId}/daily`);
    revalidatePath(`/admin/leagues/${leagueId}/ranking`);
    revalidatePath(`/admin/leagues/${leagueId}/awards`);
    revalidatePath(`/league/${leagueId}`);
    revalidatePath(`/league/${leagueId}/ranking`);
    revalidatePath(`/league/${leagueId}/predictions`);
  }
}

export async function recalculateAllLeagueScores() {
  const leagueIds = await getAllLeagueIds();
  for (const leagueId of leagueIds) {
    await recalculateLeagueScores(leagueId);
  }
  await revalidateAllLeagueViews();
}

export async function recalculateLeagueScores(leagueId: string) {
  const supabase = createSupabaseAdminClient();
  const [
    settingsResult,
    membersResult,
    matchesResult,
    teamsResult,
    scorerTotalsResult,
    finalAwardsResult,
  ] = await Promise.all([
    supabase
      .from("league_point_settings")
      .select("*")
      .eq("league_id", leagueId)
      .single<PointSettings>(),
    supabase.from("league_members").select("user_id").eq("league_id", leagueId),
    supabase.from("matches").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("league_player_goals").select("player_id, goals").eq("league_id", leagueId),
    supabase.from("final_awards").select("*").eq("league_id", leagueId).maybeSingle(),
  ]);

  const settings = withDefaultSettings({
    league_id: leagueId,
    ...(settingsResult.data ?? {}),
  });
  const members = membersResult.data ?? [];
  const matches = (matchesResult.data ?? []) as Match[];
  const teams = teamsResult.data ?? [];
  const groupLetters = Array.from(
    new Set(teams.map((team) => team.group_letter).filter(Boolean)),
  ) as string[];
  const completedGroups = groupLetters.map((group) => {
    const groupMatches = matches.filter(
      (match) => match.stage === "group" && match.group_letter === group,
    );
    return groupMatches.length > 0 && groupMatches.every((match) => match.is_finished);
  });
  const realGroups = groupLetters.map((group) =>
    calculateRealGroupStandings(teams, matches, group),
  );
  const scorerTotals = new Map<string, number>(
    (scorerTotalsResult.data ?? []).map((row) => [row.player_id, row.goals]),
  );

  for (const member of members) {
    const userId = member.user_id;
    const [
      matchPredictionsResult,
      scorerPredictionsResult,
      awardPredictionResult,
      tiebreakSelectionsResult,
    ] = await Promise.all([
      supabase
        .from("match_predictions")
        .select("*")
        .eq("league_id", leagueId)
        .eq("user_id", userId),
      supabase
        .from("scorer_predictions")
        .select("player_id, is_captain")
        .eq("league_id", leagueId)
        .eq("user_id", userId),
      supabase
        .from("award_predictions")
        .select("*")
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("prediction_tiebreak_selections")
        .select("*")
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .order("rank"),
    ]);

    const matchPredictions = (matchPredictionsResult.data ?? []) as MatchPrediction[];
    const tiebreakSelections = (tiebreakSelectionsResult.data ?? []) as PredictionTiebreakSelection[];
    const groupTiebreaks = new Map(
      groupLetters.map((group) => [
        group,
        buildManualRankMap(
          tiebreakSelections
            .filter(
              (selection) =>
                selection.scope_type === "group" && selection.scope_key === group,
            )
            .sort((left, right) => left.rank - right.rank)
            .map((selection) => selection.team_id),
        ),
      ]),
    );
    const bestThirdManualRanks = buildManualRankMap(
      tiebreakSelections
        .filter(
          (selection) =>
            selection.scope_type === "best_third" &&
            selection.scope_key === BEST_THIRD_SCOPE_KEY,
        )
        .sort((left, right) => left.rank - right.rank)
        .map((selection) => selection.team_id),
    );
    const groupPredictions = matchPredictions.filter((prediction) => {
      const match = matches.find((item) => item.id === prediction.match_id);
      return match?.stage === "group";
    });
    const knockoutPredictions = matchPredictions.filter((prediction) => {
      const match = matches.find((item) => item.id === prediction.match_id);
      return match && match.stage !== "group";
    });

    const matchPoints = calculateAllMatchPointsForUser(
      groupPredictions,
      matches,
      settings,
    );
    const predictedGroups = groupLetters.map((group) =>
      calculatePredictedGroupStandings(teams, matches, groupPredictions, group, {
        manualRanksByTeamId: groupTiebreaks.get(group),
      }),
    );
    const predictedBestThirdIds = new Set(
      calculateBestThirdPlacedTeams(predictedGroups, {
        manualRanksByTeamId: bestThirdManualRanks,
      }).map((row) => row.team.id),
    );
    const groupPoints = calculateGroupPredictionPoints(
      predictedGroups,
      realGroups,
      settings,
      completedGroups,
      predictedBestThirdIds,
    );
    const knockoutPoints = knockoutPredictions.reduce((total, prediction) => {
      const match = matches.find((item) => item.id === prediction.match_id);
      return match
        ? total + calculateLiveKnockoutMatchPoints(prediction, match, settings)
        : total;
    }, 0);
    const finalMatch = matches.find((match) => match.stage === "final");
    const finalPrediction = finalMatch
      ? matchPredictions.find((prediction) => prediction.match_id === finalMatch.id)
      : null;
    const realChampion = finalMatch ? getMatchWinner(finalMatch) : null;
    const predictedChampion =
      finalPrediction?.predicted_winner_team_id ??
      (finalMatch &&
      finalPrediction?.predicted_home_score !== null &&
      finalPrediction?.predicted_home_score !== undefined &&
      finalPrediction?.predicted_away_score !== null &&
      finalPrediction?.predicted_away_score !== undefined
        ? finalPrediction.predicted_home_score > finalPrediction.predicted_away_score
          ? finalMatch.home_team_id
          : finalPrediction.predicted_away_score > finalPrediction.predicted_home_score
            ? finalMatch.away_team_id
            : null
        : null);
    const championHit = Boolean(
      realChampion &&
        predictedChampion &&
        predictedChampion === realChampion,
    );
    const championPoints = championHit ? settings.knockout_champion_points : 0;
    const scorerPoints = calculateScorerPoints(
      scorerPredictionsResult.data ?? [],
      scorerTotals,
      settings,
    );
    const awardPoints = calculateAwardPoints(
      awardPredictionResult.data,
      finalAwardsResult.data,
      settings,
    );

    await supabase.from("scores").upsert(
      {
        league_id: leagueId,
        user_id: userId,
        total_points: calculateTotalUserScore({
          matchPoints: matchPoints.points,
          groupPoints,
          knockoutPoints: knockoutPoints + championPoints,
          scorerPoints,
          awardPoints,
        }),
        match_points: matchPoints.points,
        group_points: groupPoints,
        knockout_points: knockoutPoints + championPoints,
        scorer_points: scorerPoints,
        award_points: awardPoints,
        exact_scores_count: matchPoints.exactScores,
        champion_hit: championHit,
      },
      { onConflict: "league_id,user_id" },
    );
  }
}
