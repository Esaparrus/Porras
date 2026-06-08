import type {
  PredictionTiebreakScopeType,
  PredictionTiebreakSelection,
  StandingRow,
  Team,
} from "@/lib/types";

export const BEST_THIRD_SCOPE_KEY = "cutoff";

export type PredictionTiebreakDraft = Record<string, string[]>;

export type PredictionTiebreakPrompt = {
  scopeId: string;
  scopeType: PredictionTiebreakScopeType;
  scopeKey: string;
  title: string;
  description: string;
  teams: Team[];
  contextRows?: StandingRow[];
  qualifyingSlots?: number;
};

export function getTiebreakScopeId(
  scopeType: PredictionTiebreakScopeType,
  scopeKey: string,
) {
  return `${scopeType}:${scopeKey}`;
}

export function buildTiebreakDraft(
  rows: PredictionTiebreakSelection[],
): PredictionTiebreakDraft {
  return rows.reduce<PredictionTiebreakDraft>((draft, row) => {
    const scopeId = getTiebreakScopeId(row.scope_type, row.scope_key);
    const current = draft[scopeId] ?? [];
    current[row.rank - 1] = row.team_id;
    draft[scopeId] = current;
    return draft;
  }, {});
}

export function buildTiebreakRows(
  leagueId: string,
  userId: string,
  draft: PredictionTiebreakDraft,
) {
  return Object.entries(draft).flatMap(([scopeId, orderedTeamIds]) => {
    const [scopeType, ...scopeKeyParts] = scopeId.split(":");
    const scopeKey = scopeKeyParts.join(":");
    if (
      (scopeType !== "group" && scopeType !== "best_third") ||
      !scopeKey
    ) {
      return [];
    }

    return orderedTeamIds
      .filter(Boolean)
      .map((teamId, index) => ({
        league_id: leagueId,
        user_id: userId,
        scope_type: scopeType as PredictionTiebreakScopeType,
        scope_key: scopeKey,
        team_id: teamId,
        rank: index + 1,
      }));
  });
}

export function buildManualRankMap(orderedTeamIds: string[] | undefined) {
  return new Map(
    (orderedTeamIds ?? [])
      .filter(Boolean)
      .map((teamId, index) => [teamId, index + 1] as const),
  );
}

export function pushUniqueTieGroup(
  groups: StandingRow[][],
  rows: StandingRow[],
) {
  const signature = rows
    .map((row) => row.team.id)
    .sort()
    .join(":");
  const exists = groups.some((group) =>
    group
      .map((row) => row.team.id)
      .sort()
      .join(":") === signature,
  );
  if (!exists) groups.push(rows);
}

export function isTieResolved(rows: StandingRow[], orderedTeamIds: string[] | undefined) {
  const tiedTeamIds = new Set(rows.map((row) => row.team.id));
  const selectedTeamIds = (orderedTeamIds ?? []).slice(0, rows.length);
  return (
    selectedTeamIds.length === rows.length &&
    selectedTeamIds.every((teamId) => tiedTeamIds.has(teamId)) &&
    new Set(selectedTeamIds).size === rows.length
  );
}

export function isBestThirdTieResolved(
  rows: StandingRow[],
  orderedTeamIds: string[] | undefined,
  qualifyingSlots: number,
) {
  const tiedTeamIds = new Set(rows.map((row) => row.team.id));
  const requiredSlots = Math.min(rows.length, qualifyingSlots);
  const selectedTeamIds = (orderedTeamIds ?? []).slice(0, requiredSlots);
  return (
    requiredSlots > 0 &&
    selectedTeamIds.length === requiredSlots &&
    selectedTeamIds.every((teamId) => tiedTeamIds.has(teamId)) &&
    new Set(selectedTeamIds).size === requiredSlots
  );
}

export function buildGroupTiebreakPrompt(
  groupLetter: string,
  rows: StandingRow[],
  contextRows: StandingRow[],
): PredictionTiebreakPrompt {
  return {
    scopeId: getTiebreakScopeId("group", groupLetter),
    scopeType: "group",
    scopeKey: groupLetter,
    title: `Desempate manual del grupo ${groupLetter}`,
    description:
      "Hay equipos empatados dentro de este grupo. Ordenalos primero, porque de aqui sale quien queda 1.º, 2.º, 3.º o 4.º, y eso puede cambiar quien entra como mejor tercero.",
    teams: rows.map((row) => row.team),
    contextRows,
  };
}

export function buildBestThirdTiebreakPrompt(
  rows: StandingRow[],
  contextRows: StandingRow[],
  qualifyingSlots: number,
): PredictionTiebreakPrompt {
  return {
    scopeId: getTiebreakScopeId("best_third", BEST_THIRD_SCOPE_KEY),
    scopeType: "best_third",
    scopeKey: BEST_THIRD_SCOPE_KEY,
    title: "Desempate manual de mejores terceros",
    description:
      qualifyingSlots === 1
        ? "Con los grupos ya ordenados, estos terceros empatan para la ultima plaza de eliminatorias. Como el siguiente criterio FIFA seria fair play y no metemos tarjetas, marca quien debe pasar."
        : `Con los grupos ya ordenados, estos terceros empatan para ${qualifyingSlots} plazas de eliminatorias. Como el siguiente criterio FIFA seria fair play y no metemos tarjetas, marca quienes deben pasar primero.`,
    teams: rows.map((row) => row.team),
    contextRows,
    qualifyingSlots,
  };
}
