import type { StandingRow } from "@/lib/types";

import {
  THIRD_PLACE_COMBINATIONS,
  THIRD_PLACE_SLOT_ORDER,
} from "@/lib/world-cup-third-place";

export function getThirdPlaceAssignments(bestThirds: StandingRow[]) {
  const qualifiedGroups = bestThirds
    .map((row) => row.team.group_letter)
    .filter((group): group is string => Boolean(group))
    .sort()
    .join("");
  const slotAssignments = THIRD_PLACE_COMBINATIONS[qualifiedGroups];
  if (!slotAssignments || slotAssignments.length !== THIRD_PLACE_SLOT_ORDER.length) {
    return null;
  }

  const thirdByGroupSlot = new Map<string, StandingRow>(
    bestThirds
      .filter(
        (
          row,
        ): row is StandingRow & {
          team: StandingRow["team"] & { group_letter: string };
        } => Boolean(row.team.group_letter),
      )
      .map((row) => [`3${row.team.group_letter}`, row] as const),
  );

  const assignments = new Map<string, StandingRow>();
  THIRD_PLACE_SLOT_ORDER.forEach((winnerSlot, index) => {
    const thirdSlot = slotAssignments[index];
    const row = thirdByGroupSlot.get(thirdSlot);
    if (row) assignments.set(winnerSlot, row);
  });

  return assignments.size === THIRD_PLACE_SLOT_ORDER.length ? assignments : null;
}
