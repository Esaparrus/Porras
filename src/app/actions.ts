"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_POINT_SETTINGS } from "@/lib/constants";
import { requireAdmin, requireUser } from "@/lib/data";
import {
  calculateAllMatchPointsForUser,
  calculateAwardPoints,
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
import type { Match, MatchPrediction, PointSettings } from "@/lib/types";
import {
  authEmailForUsername,
  generateLeagueCode,
  isValidUsername,
  nullableNumberFromForm,
  normalizeUsername,
  numberFromForm,
} from "@/lib/utils";

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
    redirect("/register?error=El usuario debe tener 3-24 caracteres: letras, numeros, punto, guion o guion bajo");
  }

  if (password.length < 4) {
    redirect("/register?error=La contrasena debe tener al menos 4 caracteres");
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) redirect("/register?error=Ese usuario ya esta ocupado");

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
      redirect("/register?error=Ese usuario ya esta ocupado");
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
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    action_type: "update_points",
    description: "Puntuación actualizada correctamente",
  });
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}/settings`);
}

export async function updateLeagueLocksAction(formData: FormData) {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
  await supabase
    .from("leagues")
    .update({
      status: String(formData.get("status")),
      predictions_visible: formData.get("predictions_visible") === "on",
      lock_matches: formData.get("lock_matches") === "on",
      lock_scorers: formData.get("lock_scorers") === "on",
      lock_awards: formData.get("lock_awards") === "on",
      lock_knockouts: formData.get("lock_knockouts") === "on",
    })
    .eq("id", leagueId);
  revalidatePath(`/admin/leagues/${leagueId}`);
}

export async function saveMatchPredictionsAction(formData: FormData) {
  const { user } = await requireUser();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
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
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/league/${leagueId}/predictions`);
}

export async function saveScorerPredictionsAction(formData: FormData) {
  const { user } = await requireUser();
  const supabase = createSupabaseAdminClient();
  const leagueId = String(formData.get("league_id"));
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
  await supabase.from("award_predictions").upsert(
    {
      league_id: leagueId,
      user_id: user.id,
      top_scorer_player_id: String(formData.get("top_scorer_player_id") ?? "") || null,
      best_player_id: String(formData.get("best_player_id") ?? "") || null,
      best_goalkeeper_id: String(formData.get("best_goalkeeper_id") ?? "") || null,
      best_young_player_id: String(formData.get("best_young_player_id") ?? "") || null,
    },
    { onConflict: "league_id,user_id" },
  );
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
      is_finished: formData.get("is_finished") === "on",
    })
    .eq("id", matchId);
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    action_type: "update_result",
    description: "Resultado actualizado",
  });
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}`);
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

  await supabase.from("league_player_goals").upsert(
    {
      league_id: leagueId,
      player_id: playerId,
      goals: Math.max(0, (existing?.goals ?? 0) + delta),
    },
    { onConflict: "league_id,player_id" },
  );
  await supabase.from("admin_logs").insert({
    league_id: leagueId,
    admin_user_id: user.id,
    action_type: "quick_goal",
    description: `Goles actualizados para jugador ${playerId}`,
  });
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}/scorers`);
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

export async function recalculateLeagueScoresAction(formData: FormData) {
  await requireAdmin();
  const leagueId = String(formData.get("league_id"));
  await recalculateLeagueScores(leagueId);
  revalidatePath(`/admin/leagues/${leagueId}/ranking`);
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
    ]);

    const matchPredictions = (matchPredictionsResult.data ?? []) as MatchPrediction[];
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
      calculatePredictedGroupStandings(teams, matches, groupPredictions, group),
    );
    const groupPoints = calculateGroupPredictionPoints(
      predictedGroups,
      realGroups,
      settings,
    );
    const knockoutPoints = knockoutPredictions.reduce((total, prediction) => {
      const match = matches.find((item) => item.id === prediction.match_id);
      return match
        ? total + calculateLiveKnockoutMatchPoints(prediction, match, settings)
        : total;
    }, 0);
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
          knockoutPoints,
          scorerPoints,
          awardPoints,
        }),
        match_points: matchPoints.points,
        group_points: groupPoints,
        knockout_points: knockoutPoints,
        scorer_points: scorerPoints,
        award_points: awardPoints,
        exact_scores_count: matchPoints.exactScores,
      },
      { onConflict: "league_id,user_id" },
    );
  }
}
