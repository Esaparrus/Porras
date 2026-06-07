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
      "Estos equipos estan empatados en puntos, golaverage y los demas criterios de la tabla. El siguiente criterio FIFA seria el fair play, asi que aqui lo resolvemos a mano: marca quien debe quedar por delante.",
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
        ? "Estos terceros estan empatados en puntos, golaverage y goles a favor para la ultima plaza de eliminatorias. El siguiente criterio FIFA seria el fair play, asi que aqui lo resolvemos a mano: marca quien debe pasar."
        : `Estos terceros estan empatados en puntos, golaverage y goles a favor para ${qualifyingSlots} plazas de eliminatorias. El siguiente criterio FIFA seria el fair play, asi que aqui lo resolvemos a mano: marca quienes deben pasar primero.`,
    teams: rows.map((row) => row.team),
    contextRows,
    qualifyingSlots,
  };
}
