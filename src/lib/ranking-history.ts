import type { Score } from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RankingMovement = {
  delta: number;
  direction: "up" | "down" | "same";
};

type RankingSnapshotRow = {
  user_id: string;
  position: number;
  snapshot_date: string;
};

export async function getRankingMovementByUser(
  leagueId: string,
  orderedScores: Score[],
) {
  const supabase = createSupabaseAdminClient();
  const snapshotDate = getMadridDateKey();
  const bootstrapPreviousSnapshotDate = getMadridDateKey(
    shiftMadridDateByDays(new Date(), -1),
  );

  const { count } = await supabase
    .from("ranking_daily_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("league_id", leagueId)
    .eq("snapshot_date", snapshotDate);

  if (!count) {
    const rows = orderedScores.map((score, index) => ({
      league_id: leagueId,
      user_id: score.user_id,
      snapshot_date: snapshotDate,
      position: index + 1,
      total_points: score.total_points,
      exact_scores_count: score.exact_scores_count,
    }));

    if (rows.length) {
      await supabase.from("ranking_daily_snapshots").upsert(rows, {
        onConflict: "league_id,snapshot_date,user_id",
      });

      const { count: historicalCount } = await supabase
        .from("ranking_daily_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("league_id", leagueId)
        .lt("snapshot_date", snapshotDate);

      if (!historicalCount) {
        await supabase.from("ranking_daily_snapshots").upsert(
          rows.map((row) => ({
            ...row,
            snapshot_date: bootstrapPreviousSnapshotDate,
          })),
          {
            onConflict: "league_id,snapshot_date,user_id",
          },
        );
      }
    }
  }

  const { data: previousSnapshotDateRows } = await supabase
    .from("ranking_daily_snapshots")
    .select("snapshot_date")
    .eq("league_id", leagueId)
    .lt("snapshot_date", snapshotDate)
    .order("snapshot_date", { ascending: false })
    .limit(1);

  const previousSnapshotDate = previousSnapshotDateRows?.[0]?.snapshot_date;
  if (!previousSnapshotDate) {
    return new Map<string, RankingMovement | null>();
  }

  const { data: previousSnapshotRows } = await supabase
    .from("ranking_daily_snapshots")
    .select("user_id, position, snapshot_date")
    .eq("league_id", leagueId)
    .eq("snapshot_date", previousSnapshotDate);

  return buildMovementMap(orderedScores, (previousSnapshotRows ?? []) as RankingSnapshotRow[]);
}

function buildMovementMap(scores: Score[], previousSnapshotRows: RankingSnapshotRow[]) {
  const previousPositionByUserId = new Map(
    previousSnapshotRows.map((row) => [row.user_id, row.position]),
  );

  return scores.reduce<Map<string, RankingMovement | null>>((movementByUserId, score, index) => {
    const previousPosition = previousPositionByUserId.get(score.user_id);
    if (!previousPosition) {
      movementByUserId.set(score.user_id, null);
      return movementByUserId;
    }

    const currentPosition = index + 1;
    const delta = previousPosition - currentPosition;
    movementByUserId.set(score.user_id, {
      delta: Math.abs(delta),
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
    });
    return movementByUserId;
  }, new Map());
}

function getMadridDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function shiftMadridDateByDays(date: Date, days: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}
