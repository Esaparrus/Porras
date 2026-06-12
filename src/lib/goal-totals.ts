import type { SupabaseClient } from "@supabase/supabase-js";

// Fija el total de goles de un jugador en todas las ligas como override manual.
export async function syncAllLeaguesPlayerGoalValue(
  supabase: SupabaseClient,
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

// Reagrega los totales de goles por liga. Fuente por jugador, de mayor a menor
// prioridad: override manual del admin -> goles por partido (match_scorers) ->
// total de la API (players.api_goals). Asi el modo manual siempre manda y los
// proveedores que solo dan totales (football-data) tambien alimentan la tabla.
export async function syncLeagueGoalTotalsFromMatchScorers(supabase: SupabaseClient) {
  const [{ data: leagues }, { data: scorerRows }, { data: apiGoalRows }] = await Promise.all([
    supabase.from("leagues").select("id"),
    supabase.from("match_scorers").select("player_id, goals"),
    supabase.from("players").select("id, api_goals").not("api_goals", "is", null),
  ]);

  const totals = new Map<string, number>();
  (scorerRows ?? []).forEach((row) => {
    totals.set(row.player_id, (totals.get(row.player_id) ?? 0) + row.goals);
  });

  const apiGoals = new Map<string, number>(
    (apiGoalRows ?? []).map((row) => [row.id, row.api_goals as number]),
  );

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

    const playerIds = new Set([
      ...totals.keys(),
      ...manualOverrides.keys(),
      ...apiGoals.keys(),
    ]);

    if (playerIds.size) {
      await supabase.from("league_player_goals").insert(
        Array.from(playerIds).map((playerId) => ({
          league_id: league.id,
          player_id: playerId,
          goals:
            manualOverrides.get(playerId) ??
            totals.get(playerId) ??
            apiGoals.get(playerId) ??
            0,
          manual_goals_override: manualOverrides.get(playerId) ?? null,
        })),
      );
    }
  }
}
