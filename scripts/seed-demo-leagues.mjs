import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_POINT_SETTINGS = {
  match_exact_score_points: 4,
  match_sign_points: 1,
  group_exact_position_points: 2,
  group_winner_bonus_points: 3,
  group_qualified_team_points: 2,
  best_third_team_points: 3,
  knockout_round_32_reached_points: 2,
  knockout_round_16_reached_points: 3,
  knockout_quarter_reached_points: 5,
  knockout_semi_reached_points: 8,
  knockout_final_reached_points: 12,
  knockout_champion_points: 30,
  live_round_32_winner_points: 2,
  live_round_32_exact_score_bonus: 3,
  live_round_16_winner_points: 3,
  live_round_16_exact_score_bonus: 3,
  live_quarter_winner_points: 4,
  live_quarter_exact_score_bonus: 4,
  live_semi_winner_points: 5,
  live_semi_exact_score_bonus: 4,
  live_final_winner_points: 8,
  live_final_exact_score_bonus: 5,
  scorer_goal_points: 2,
  scorer_captain_extra_goal_points: 1,
  scorer_max_points: 50,
  award_top_scorer_points: 25,
  award_best_player_points: 18,
  award_best_goalkeeper_points: 12,
  award_best_young_player_points: 10,
};

const DEMO_PASSWORD = "demo1234";
const DEMO_LEAGUES = [
  {
    name: "Liga Demo Norte",
    code: "DEMO-NORTE",
    entryPrice: 10,
    paymentStatuses: ["paid", "paid", "pending", "paid", "pending"],
    players: [
      { username: "demo.norte1", displayName: "Norte Uno" },
      { username: "demo.norte2", displayName: "Norte Dos" },
      { username: "demo.norte3", displayName: "Norte Tres" },
      { username: "demo.norte4", displayName: "Norte Cuatro" },
      { username: "demo.norte5", displayName: "Norte Cinco" },
    ],
  },
  {
    name: "Liga Demo Centro",
    code: "DEMO-CENTRO",
    entryPrice: 15,
    paymentStatuses: ["paid", "pending", "paid", "paid", "pending"],
    players: [
      { username: "demo.centro1", displayName: "Centro Uno" },
      { username: "demo.centro2", displayName: "Centro Dos" },
      { username: "demo.centro3", displayName: "Centro Tres" },
      { username: "demo.centro4", displayName: "Centro Cuatro" },
      { username: "demo.centro5", displayName: "Centro Cinco" },
    ],
  },
  {
    name: "Liga Demo Sur",
    code: "DEMO-SUR",
    entryPrice: 20,
    paymentStatuses: ["pending", "paid", "paid", "pending", "paid"],
    players: [
      { username: "demo.sur1", displayName: "Sur Uno" },
      { username: "demo.sur2", displayName: "Sur Dos" },
      { username: "demo.sur3", displayName: "Sur Tres" },
      { username: "demo.sur4", displayName: "Sur Cuatro" },
      { username: "demo.sur5", displayName: "Sur Cinco" },
    ],
  },
];

const PLAYER_PICK_SETS = [
  {
    scorers: ["Kylian Mbappe", "Lamine Yamal", "Erling Haaland"],
    captain: "Kylian Mbappe",
    awards: {
      top_scorer: "Kylian Mbappe",
      best_player: "Lamine Yamal",
      best_goalkeeper: "Kylian Mbappe",
      best_young_player: "Lamine Yamal",
    },
  },
  {
    scorers: ["Ferran Torres", "Mohamed Salah", "Darwin Nunez"],
    captain: "Mohamed Salah",
    awards: {
      top_scorer: "Mohamed Salah",
      best_player: "Mohamed Salah",
      best_goalkeeper: "Darwin Nunez",
      best_young_player: "Lamine Yamal",
    },
  },
  {
    scorers: ["Mehdi Taremi", "Sadio Mane", "Lamine Yamal"],
    captain: "Lamine Yamal",
    awards: {
      top_scorer: "Mehdi Taremi",
      best_player: "Sadio Mane",
      best_goalkeeper: "Mehdi Taremi",
      best_young_player: "Lamine Yamal",
    },
  },
  {
    scorers: ["Darwin Nunez", "Kylian Mbappe", "Mohamed Salah"],
    captain: "Darwin Nunez",
    awards: {
      top_scorer: "Darwin Nunez",
      best_player: "Kylian Mbappe",
      best_goalkeeper: "Mohamed Salah",
      best_young_player: "Lamine Yamal",
    },
  },
  {
    scorers: ["Erling Haaland", "Salem Al-Dawsari", "Sadio Mane"],
    captain: "Erling Haaland",
    awards: {
      top_scorer: "Erling Haaland",
      best_player: "Erling Haaland",
      best_goalkeeper: "Sadio Mane",
      best_young_player: "Lamine Yamal",
    },
  },
];

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function listAllUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    users.push(...(data?.users ?? []));
    if (!data?.users?.length || data.users.length < 200) break;
    page += 1;
  }

  return users;
}

async function getOrCreateDemoUser(username, displayName) {
  const email = `${username}@porra.local`;
  const users = await listAllUsers();
  let user = users.find((item) => item.email === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName, username },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName, username },
    });
    if (error) throw error;
    user = data.user;
  }

  ensure(user?.id, `No se pudo asegurar el usuario ${username}`);

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    username,
    display_name: displayName,
    role: "player",
  });

  if (profileError) throw profileError;

  return user;
}

async function deleteExistingDemoLeagues() {
  const codes = DEMO_LEAGUES.map((league) => league.code);
  const { data: existing, error } = await supabase
    .from("leagues")
    .select("id, code")
    .in("code", codes);

  if (error) throw error;
  if (!existing?.length) return;

  const { error: deleteError } = await supabase.from("leagues").delete().in(
    "id",
    existing.map((league) => league.id),
  );

  if (deleteError) throw deleteError;
}

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
}

function findPlayerByName(name, playerRows, playerByNormalizedName) {
  const normalizedTarget = normalizeName(name).toLowerCase();
  const exact = playerByNormalizedName.get(normalizedTarget);
  if (exact) return exact;

  return (
    playerRows.find((player) => normalizeName(player.name).toLowerCase() === normalizedTarget) ??
    playerRows.find((player) => normalizeName(player.name).toLowerCase().includes(normalizedTarget)) ??
    playerRows.find((player) => normalizedTarget.includes(normalizeName(player.name).toLowerCase())) ??
    null
  );
}

function computePrediction(match, profileIndex) {
  if (!match.home_team_id || !match.away_team_id) {
    const home = (match.match_number + profileIndex) % 3;
    const away = (match.match_number + profileIndex + 1) % 3;
    return {
      predicted_home_score: home,
      predicted_away_score: away,
      predicted_winner_team_id: null,
    };
  }

  const homeRank = match.home_team?.fifa_ranking ?? 40;
  const awayRank = match.away_team?.fifa_ranking ?? 40;
  const rankingDelta = awayRank - homeRank;
  const bias = profileIndex - 2;
  let homeGoals = 1;
  let awayGoals = 1;

  if (rankingDelta >= 15) {
    homeGoals = 2 + (profileIndex % 2);
    awayGoals = profileIndex % 2;
  } else if (rankingDelta <= -15) {
    homeGoals = profileIndex % 2;
    awayGoals = 2 + ((profileIndex + 1) % 2);
  } else if (rankingDelta >= 5) {
    homeGoals = 2;
    awayGoals = bias > 1 ? 1 : 0;
  } else if (rankingDelta <= -5) {
    homeGoals = bias < -1 ? 1 : 0;
    awayGoals = 2;
  } else {
    homeGoals = 1 + (profileIndex % 2);
    awayGoals = 1 + ((profileIndex + 1) % 2);
  }

  if (homeGoals === awayGoals) {
    if (bias >= 2) homeGoals += 1;
    if (bias <= -2) awayGoals += 1;
  }

  let predictedWinnerTeamId = null;
  if (homeGoals > awayGoals) predictedWinnerTeamId = match.home_team_id;
  if (awayGoals > homeGoals) predictedWinnerTeamId = match.away_team_id;

  return {
    predicted_home_score: homeGoals,
    predicted_away_score: awayGoals,
    predicted_winner_team_id: predictedWinnerTeamId,
  };
}

async function main() {
  const [{ data: teams, error: teamsError }, { data: players, error: playersError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("players").select("*, teams(*)").eq("is_active", true),
      supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .order("match_number", { ascending: true, nullsFirst: false }),
    ]);

  if (teamsError) throw teamsError;
  if (playersError) throw playersError;
  if (matchesError) throw matchesError;

  const teamRows = teams ?? [];
  const playerRows = players ?? [];
  const matchRows = matches ?? [];

  const teamsWithoutPlayers = teamRows.filter(
    (team) => !playerRows.some((player) => player.team_id === team.id),
  );

  if (teamsWithoutPlayers.length) {
    const { error: placeholderError } = await supabase.from("players").upsert(
      teamsWithoutPlayers.map((team, index) => ({
        name: `Jugador referencia ${team.short_name}`,
        team_id: team.id,
        position: "FW",
        is_star: false,
        scorer_rank: 900 + index,
        is_active: true,
      })),
      { onConflict: "team_id,name" },
    );

    if (placeholderError) throw placeholderError;
  }

  const { data: refreshedPlayers, error: refreshedPlayersError } = await supabase
    .from("players")
    .select("*, teams(*)")
    .eq("is_active", true);

  if (refreshedPlayersError) throw refreshedPlayersError;

  const activePlayers = refreshedPlayers ?? [];
  const playerByNormalizedName = new Map(
    activePlayers.map((player) => [normalizeName(player.name).toLowerCase(), player]),
  );

  await deleteExistingDemoLeagues();

  for (const match of matchRows) {
    const { error: matchUpdateError } = await supabase
      .from("matches")
      .update({
        home_score: null,
        away_score: null,
        winner_team_id: null,
        is_finished: false,
      })
      .eq("id", match.id);

    if (matchUpdateError) throw matchUpdateError;
  }

  const { error: clearScorersError } = await supabase.from("match_scorers").delete().not("id", "is", null);
  if (clearScorersError) throw clearScorersError;

  const createdLeagues = [];

  for (const leagueConfig of DEMO_LEAGUES) {
    const demoUsers = [];

    for (const playerConfig of leagueConfig.players) {
      const user = await getOrCreateDemoUser(playerConfig.username, playerConfig.displayName);
      demoUsers.push({
        id: user.id,
        username: playerConfig.username,
        displayName: playerConfig.displayName,
      });
    }

    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .insert({
        name: leagueConfig.name,
        code: leagueConfig.code,
        status: "in_progress",
        predictions_visible: true,
        lock_matches: false,
        lock_scorers: false,
        lock_awards: false,
        lock_knockouts: false,
        entry_price: leagueConfig.entryPrice,
      })
      .select("*")
      .single();
    if (leagueError) throw leagueError;

    const { error: settingsError } = await supabase
      .from("league_point_settings")
      .upsert({ league_id: league.id, ...DEFAULT_POINT_SETTINGS }, { onConflict: "league_id" });
    if (settingsError) throw settingsError;

    const membershipRows = demoUsers.map((user, index) => ({
      league_id: league.id,
      user_id: user.id,
      payment_status: leagueConfig.paymentStatuses[index] ?? "pending",
    }));

    const { error: membershipError } = await supabase.from("league_members").insert(membershipRows);
    if (membershipError) throw membershipError;

    const scoreRows = [];
    const predictionRows = [];
    const scorerPredictionRows = [];
    const awardPredictionRows = [];

    demoUsers.forEach((user, profileIndex) => {
      matchRows.forEach((match) => {
        const prediction = computePrediction(match, profileIndex);
        predictionRows.push({
          league_id: league.id,
          user_id: user.id,
          match_id: match.id,
          predicted_home_score: prediction.predicted_home_score,
          predicted_away_score: prediction.predicted_away_score,
          predicted_winner_team_id: prediction.predicted_winner_team_id,
          points: 0,
        });
      });

      const pickSet = PLAYER_PICK_SETS[(profileIndex + createdLeagues.length) % PLAYER_PICK_SETS.length];
      const scorerIds = pickSet.scorers
        .map((name) => findPlayerByName(name, activePlayers, playerByNormalizedName)?.id)
        .filter(Boolean);
      const captainId =
        findPlayerByName(pickSet.captain, activePlayers, playerByNormalizedName)?.id ?? null;

      scorerIds.forEach((playerId) => {
        scorerPredictionRows.push({
          league_id: league.id,
          user_id: user.id,
          player_id: playerId,
          is_captain: playerId === captainId,
          points: 0,
        });
      });

      awardPredictionRows.push({
        league_id: league.id,
        user_id: user.id,
        top_scorer_player_id:
          findPlayerByName(pickSet.awards.top_scorer, activePlayers, playerByNormalizedName)?.id ?? null,
        best_player_id:
          findPlayerByName(pickSet.awards.best_player, activePlayers, playerByNormalizedName)?.id ?? null,
        best_goalkeeper_id:
          findPlayerByName(pickSet.awards.best_goalkeeper, activePlayers, playerByNormalizedName)?.id ?? null,
        best_young_player_id:
          findPlayerByName(pickSet.awards.best_young_player, activePlayers, playerByNormalizedName)?.id ?? null,
        points: 0,
      });
    });

    const { error: predictionError } = await supabase.from("match_predictions").insert(predictionRows);
    if (predictionError) throw predictionError;

    const { error: scorerPredictionError } = await supabase
      .from("scorer_predictions")
      .insert(scorerPredictionRows);
    if (scorerPredictionError) throw scorerPredictionError;

    const { error: awardPredictionError } = await supabase
      .from("award_predictions")
      .insert(awardPredictionRows);
    if (awardPredictionError) throw awardPredictionError;

    demoUsers.forEach((user) => {
      scoreRows.push({
        league_id: league.id,
        user_id: user.id,
        total_points: 0,
        match_points: 0,
        group_points: 0,
        knockout_points: 0,
        scorer_points: 0,
        award_points: 0,
        exact_scores_count: 0,
        champion_hit: false,
      });
    });

    const { error: scoreError } = await supabase.from("scores").insert(scoreRows);
    if (scoreError) throw scoreError;

    createdLeagues.push({
      ...league,
      users: demoUsers,
    });
  }

  console.log("");
  console.log("Ligas demo creadas:");
  createdLeagues.forEach((league) => {
    console.log(`- ${league.name} (${league.code})`);
    league.users.forEach((user) => {
      console.log(`  - ${user.username} / ${DEMO_PASSWORD}`);
    });
  });
}

await main();
