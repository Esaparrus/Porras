import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiFootballSyncResult } from "@/lib/api-football";

export type ResultsProvider = "api-football" | "football-data";

// Elige el proveedor de resultados. Explicito via RESULTS_PROVIDER; si no, se
// autodetecta: si hay token de football-data, se usa ese (su plan gratis cubre
// el Mundial 2026); en caso contrario, API-Football.
export function resolveResultsProvider(): ResultsProvider {
  const explicit = process.env.RESULTS_PROVIDER?.toLowerCase();
  if (explicit === "football-data" || explicit === "api-football") return explicit;
  if (process.env.FOOTBALL_DATA_TOKEN) return "football-data";
  return "api-football";
}

export async function syncResults(
  supabase: SupabaseClient,
  options: { now?: Date; source?: string } = {},
): Promise<ApiFootballSyncResult> {
  if (resolveResultsProvider() === "football-data") {
    const { syncFinishedResultsFromFootballData } = await import("@/lib/football-data");
    return syncFinishedResultsFromFootballData(supabase, options);
  }
  const { syncFinishedResultsFromApiFootball } = await import("@/lib/api-football");
  return syncFinishedResultsFromApiFootball(supabase, options);
}
