"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, Check, ChevronDown, ChevronUp, Grid2X2, Save } from "lucide-react";
import { saveMatchPredictionsAction } from "@/app/actions";
import { GroupStandingTable, MatchTeamLabel, TeamBadge } from "@/components/ui";
import { STAGE_LABELS } from "@/lib/constants";
import {
  BEST_THIRD_SCOPE_KEY,
  buildBestThirdTiebreakPrompt,
  buildGroupTiebreakPrompt,
  buildManualRankMap,
  buildTiebreakDraft,
  getTiebreakScopeId,
  pushUniqueTieGroup,
  type PredictionTiebreakDraft,
  type PredictionTiebreakPrompt,
} from "@/lib/prediction-tiebreaks";
import {
  calculateBestThirdPlacedTeams,
  calculatePredictedGroupStandings,
  calculateRealGroupStandings,
} from "@/lib/scoring";
import { getThirdPlaceAssignments } from "@/lib/world-cup-third-place-assignments";
import type {
  Match,
  MatchPrediction,
  PredictionTiebreakSelection,
  StandingRow,
  Team,
} from "@/lib/types";
import { getTeamFlagImageUrl } from "@/lib/utils";

type DraftPrediction = {
  home: string;
  away: string;
  winnerId: string;
};

type KnockoutMatch = Match & {
  predictedHomeTeam?: Team | null;
  predictedAwayTeam?: Team | null;
};

type MatchSortMode = "group" | "date";
type SaveMode = "auto" | "manual";
type SaveStatus =
  | { kind: "idle"; message: string }
  | { kind: "saving"; mode: SaveMode; message: string }
  | { kind: "saved"; mode: SaveMode; message: string }
  | { kind: "error"; mode: SaveMode; message: string };

const ROUND_32_SLOTS: Record<number, [string, string]> = {
  73: ["2A", "2B"],
  74: ["1E", "3ABCDF"],
  75: ["1F", "2C"],
  76: ["1C", "2F"],
  77: ["1I", "3CDFGH"],
  78: ["2E", "2I"],
  79: ["1A", "3CEFHI"],
  80: ["1L", "3EHIJK"],
  81: ["1D", "3BEFIJ"],
  82: ["1G", "3AEHIJ"],
  83: ["2K", "2L"],
  84: ["1H", "2J"],
  85: ["1B", "3EFGIJ"],
  86: ["1J", "2H"],
  87: ["1K", "3DEIJL"],
  88: ["2D", "2G"],
};

const WINNER_SLOTS: Record<number, [number, number]> = {
  89: [74, 77],
  90: [73, 75],
  91: [76, 78],
  92: [79, 80],
  93: [83, 84],
  94: [81, 82],
  95: [86, 88],
  96: [85, 87],
  97: [89, 90],
  98: [93, 94],
  99: [91, 92],
  100: [95, 96],
  101: [97, 98],
  102: [99, 100],
  104: [101, 102],
};

const LOSER_SLOTS: Record<number, [number, number]> = {
  103: [101, 102],
};

const KNOCKOUT_ROUNDS = [
  "round_32",
  "round_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
] as const;

const LEFT_BRACKET_COLUMNS = [
  { stage: "round_32", matchNumbers: [74, 77, 73, 75, 83, 84, 81, 82] },
  { stage: "round_16", matchNumbers: [89, 90, 93, 94] },
  { stage: "quarter_final", matchNumbers: [97, 98] },
  { stage: "semi_final", matchNumbers: [101] },
] as const;

const RIGHT_BRACKET_COLUMNS = [
  { stage: "semi_final", matchNumbers: [102] },
  { stage: "quarter_final", matchNumbers: [99, 100] },
  { stage: "round_16", matchNumbers: [91, 92, 95, 96] },
  { stage: "round_32", matchNumbers: [76, 78, 79, 80, 86, 88, 85, 87] },
] as const;

export function PredictionWorkflow({
  leagueId,
  matches,
  predictions,
  tiebreakSelections,
  teams,
  groupLetters,
  locked,
}: {
  leagueId: string;
  matches: Match[];
  predictions: MatchPrediction[];
  tiebreakSelections: PredictionTiebreakSelection[];
  teams: Team[];
  groupLetters: string[];
  locked: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [matchSortMode, setMatchSortMode] = useState<MatchSortMode>("group");
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [draft, setDraft] = useState<Record<string, DraftPrediction>>(() =>
    Object.fromEntries(
      matches.map((match) => {
        const prediction = predictions.find((item) => item.match_id === match.id);
        return [
          match.id,
          {
            home: prediction?.predicted_home_score?.toString() ?? "",
            away: prediction?.predicted_away_score?.toString() ?? "",
            winnerId: prediction?.predicted_winner_team_id ?? "",
          },
        ];
      }),
    ),
  );
  const [tiebreakDraft, setTiebreakDraft] = useState<PredictionTiebreakDraft>(() =>
    buildTiebreakDraft(tiebreakSelections),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    kind: "idle",
    message: locked ? "Las apuestas estan bloqueadas." : "Autoguardado activo.",
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSaveRef = useRef(false);
  const queuedSaveModeRef = useRef<SaveMode | null>(null);

  const predictionRows = useMemo(
    () =>
      matches.map((match) => ({
        id: `${match.id}-draft`,
        league_id: leagueId,
        user_id: "draft",
        match_id: match.id,
        predicted_home_score: numberOrNull(draft[match.id]?.home),
        predicted_away_score: numberOrNull(draft[match.id]?.away),
        predicted_winner_team_id: draft[match.id]?.winnerId || null,
        points: 0,
      })),
    [draft, leagueId, matches],
  );
  const predictedGroupState = useMemo(() => {
    const unresolvedGroupTies: Array<{ group: string; rows: StandingRow[] }> = [];
    const standingsByGroup = new Map(
      groupLetters.map((group) => {
        const groupUnresolved: StandingRow[][] = [];
        const rows = calculatePredictedGroupStandings(
          teams,
          matches,
          predictionRows,
          group,
          {
            manualRanksByTeamId: buildManualRankMap(
              tiebreakDraft[getTiebreakScopeId("group", group)],
            ),
            collectUnresolvedTie: (rows) => pushUniqueTieGroup(groupUnresolved, rows),
          },
        );
        groupUnresolved.forEach((rows) => unresolvedGroupTies.push({ group, rows }));
        return [group, rows];
      }),
    );

    return { standingsByGroup, unresolvedGroupTies };
  }, [groupLetters, matches, predictionRows, teams, tiebreakDraft]);
  const standingsByGroup = predictedGroupState.standingsByGroup;
  const realStandingsByGroup = useMemo(
    () =>
      new Map(
        groupLetters.map((group) => [
          group,
          calculateRealGroupStandings(teams, matches, group),
        ]),
      ),
    [groupLetters, matches, teams],
  );

  const groupMatchRows = useMemo(
    () => matches.filter((match) => match.stage === "group"),
    [matches],
  );
  const completedGroups = useMemo(
    () =>
      new Set(
        groupLetters.filter((group) =>
          groupMatchRows
            .filter((match) => match.group_letter === group)
            .every((match) => {
              const item = draft[match.id];
              return numberOrNull(item?.home) !== null && numberOrNull(item?.away) !== null;
            }),
        ),
      ),
    [draft, groupLetters, groupMatchRows],
  );
  const allGroupsPredicted =
    groupMatchRows.length > 0 && completedGroups.size === groupLetters.length;
  const groupedPredictionMatches = useMemo(
    () =>
      groupLetters.map((group) => ({
        key: group,
        title: `Grupo ${group}`,
        matches: groupMatchRows.filter((match) => match.group_letter === group),
      })),
    [groupLetters, groupMatchRows],
  );
  const datedPredictionMatches = useMemo(
    () =>
      Array.from(
        groupMatchRows.reduce((groups, match) => {
          const key = formatMatchDay(match.match_date);
          groups.set(key, [...(groups.get(key) ?? []), match]);
          return groups;
        }, new Map<string, Match[]>()),
        ([key, matchesForDay]) => ({
          key,
          title: key,
          matches: matchesForDay,
        }),
      ),
    [groupMatchRows],
  );
  const predictionSections =
    matchSortMode === "group" ? groupedPredictionMatches : datedPredictionMatches;
  const predictedBestThirdState = useMemo(() => {
    const unresolvedBestThirdTies: StandingRow[][] = [];
    const bestThirds = calculateBestThirdPlacedTeams(
      Array.from(standingsByGroup.values()),
      {
        manualRanksByTeamId: buildManualRankMap(
          tiebreakDraft[getTiebreakScopeId("best_third", BEST_THIRD_SCOPE_KEY)],
        ),
        collectUnresolvedTie: (rows) => pushUniqueTieGroup(unresolvedBestThirdTies, rows),
      },
    );
    return {
      bestThirds,
      unresolvedBestThirdTies,
      thirdPlaceAssignments: getThirdPlaceAssignments(bestThirds),
    };
  }, [standingsByGroup, tiebreakDraft]);
  const tiebreakPrompts = useMemo(() => {
    const prompts = predictedGroupState.unresolvedGroupTies
      .filter(({ group }) => completedGroups.has(group))
      .map(({ group, rows }) => buildGroupTiebreakPrompt(group, rows));
    if (
      allGroupsPredicted &&
      predictedBestThirdState.unresolvedBestThirdTies.length
    ) {
      prompts.push(
        buildBestThirdTiebreakPrompt(
          predictedBestThirdState.unresolvedBestThirdTies[0] ?? [],
        ),
      );
    }
    return prompts;
  }, [
    allGroupsPredicted,
    completedGroups,
    predictedBestThirdState.unresolvedBestThirdTies,
    predictedGroupState.unresolvedGroupTies,
  ]);
  const knockoutMatches = useMemo(
    () =>
      buildKnockoutMatches(
        matches,
        standingsByGroup,
      predictedBestThirdState.thirdPlaceAssignments,
      draft,
      completedGroups,
      allGroupsPredicted,
      ),
    [
      allGroupsPredicted,
      completedGroups,
      draft,
      matches,
      predictedBestThirdState.thirdPlaceAssignments,
      standingsByGroup,
    ],
  );
  const finishedGroupMatches = groupMatchRows.filter((match) => match.is_finished).length;
  const completedGroupPredictions = groupMatchRows.filter((match) => {
    const item = draft[match.id];
    return item?.home !== "" && item?.away !== "";
  }).length;
  const draftSnapshot = useMemo(
    () => serializeDraftSnapshot(matches, draft, tiebreakDraft),
    [draft, matches, tiebreakDraft],
  );
  const lastSavedSnapshotRef = useRef(draftSnapshot);

  const knockoutIssuesByRound = useMemo(
    () =>
      new Map(
        KNOCKOUT_ROUNDS.map((round) => {
          const issues = knockoutMatches.reduce(
            (total, match) =>
              match.stage === round
                ? total + getMatchIssues(match, draft[match.id]).length
                : total,
            0,
          );
          return [round, issues];
        }),
      ),
    [draft, knockoutMatches],
  );
  const knockoutByNumber = useMemo(
    () =>
      new Map(
        knockoutMatches.map((match) => [match.match_number ?? 0, match]),
      ),
    [knockoutMatches],
  );

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const savePredictions = useCallback(async (mode: SaveMode) => {
    if (locked) return;

    const snapshot = serializeDraftSnapshot(matches, draft, tiebreakDraft);
    if (snapshot === lastSavedSnapshotRef.current) {
      if (mode === "manual") {
        setSaveStatus({
          kind: "saved",
          mode,
          message: "Los resultados se han guardado.",
        });
      }
      return;
    }

    if (inFlightSaveRef.current) {
      queuedSaveModeRef.current = mode === "manual" ? "manual" : (queuedSaveModeRef.current ?? "auto");
      return;
    }

    inFlightSaveRef.current = true;
    setSaveStatus({
      kind: "saving",
      mode,
      message: mode === "manual" ? "Guardando resultados..." : "Autoguardando...",
    });

    try {
      await saveMatchPredictionsAction(
        buildPredictionFormData(leagueId, matches, draft, tiebreakDraft),
      );
      lastSavedSnapshotRef.current = snapshot;
      setSaveStatus({
        kind: "saved",
        mode,
        message:
          mode === "manual"
            ? "Los resultados se han guardado."
            : `Autoguardado a las ${formatSaveTime(new Date())}.`,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setSaveStatus({
        kind: "error",
        mode,
        message:
          mode === "manual"
            ? "No se han podido guardar los resultados."
            : "Ha fallado el autoguardado. Pulsa Guardar apuestas.",
      });
    } finally {
      inFlightSaveRef.current = false;
      const queuedMode = queuedSaveModeRef.current;
      queuedSaveModeRef.current = null;
      if (
        queuedMode &&
        serializeDraftSnapshot(matches, draft, tiebreakDraft) !==
          lastSavedSnapshotRef.current
      ) {
        void savePredictions(queuedMode);
      }
    }
  }, [draft, leagueId, locked, matches, router, startTransition, tiebreakDraft]);

  useEffect(() => {
    if (locked || inFlightSaveRef.current) return;

    if (draftSnapshot === lastSavedSnapshotRef.current) return;

    setSaveStatus((current) =>
      current.kind === "saving"
        ? current
        : { kind: "idle", message: "Cambios pendientes de autoguardado." },
    );

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void savePredictions("auto");
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draftSnapshot, locked, savePredictions]);

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void savePredictions("manual");
  }

  const visibleSaveStatus = locked
    ? { kind: "idle" as const, message: "Las apuestas estan bloqueadas." }
    : saveStatus;

  function updateScore(match: KnockoutMatch | Match, side: "home" | "away", value: string) {
    setDraft((current) => {
      const previous = current[match.id] ?? { home: "", away: "", winnerId: "" };
      const next = { ...previous, [side]: value };
      const homeTeam = "predictedHomeTeam" in match ? match.predictedHomeTeam : match.home_team;
      const awayTeam = "predictedAwayTeam" in match ? match.predictedAwayTeam : match.away_team;
      const homeScore = numberOrNull(next.home);
      const awayScore = numberOrNull(next.away);

      if (match.stage !== "group" && homeTeam && awayTeam && homeScore !== null && awayScore !== null) {
        if (homeScore > awayScore) next.winnerId = homeTeam.id;
        if (awayScore > homeScore) next.winnerId = awayTeam.id;
        if (homeScore === awayScore && ![homeTeam.id, awayTeam.id].includes(next.winnerId)) {
          next.winnerId = "";
        }
      }

      return { ...current, [match.id]: next };
    });
  }

  function updateWinner(matchId: string, winnerId: string) {
    setDraft((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] ?? { home: "", away: "", winnerId: "" }),
        winnerId,
      },
    }));
  }

  function updateTiebreakOrder(scopeId: string, position: number, teamId: string) {
    setTiebreakDraft((current) => {
      const next = [...(current[scopeId] ?? [])];
      const duplicateIndex = next.findIndex(
        (candidate, index) => candidate === teamId && index !== position,
      );
      if (duplicateIndex >= 0) next[duplicateIndex] = "";
      next[position] = teamId;
      return { ...current, [scopeId]: next };
    });
  }

  return (
    <form onSubmit={handleManualSubmit} className="space-y-8">

      <section id="grupos" className="glass scroll-mt-6 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[#ff7a1a]">
              Paso 1
            </p>
            <h2 className="mt-1 text-2xl font-black">Clasificacion de grupos</h2>
            <p className="mt-1 text-sm text-slate-300">
              Se actualiza automaticamente con los resultados que tienes guardados.
            </p>
          </div>
          <div className="prediction-group-summary">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-200">
              {finishedGroupMatches}/{groupMatchRows.length} partidos de grupo jugados
            </div>
            <button
              type="button"
              className="prediction-collapse-button"
              aria-controls="group-standings-panel"
              aria-expanded={groupsExpanded}
              onClick={() => setGroupsExpanded((current) => !current)}
            >
              {groupsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {groupsExpanded ? "Replegar grupos" : "Desplegar grupos"}
            </button>
          </div>
        </div>

        {groupsExpanded ? (
          <div id="group-standings-panel" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupLetters.map((group) => {
              const groupMatches = matches.filter(
                (match) => match.stage === "group" && match.group_letter === group,
              );
              const finishedCount = groupMatches.filter((match) => match.is_finished).length;
              return (
                <section
                  key={group}
                  className="prediction-group-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black">
                      Grupo {group}
                    </h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                      {finishedCount}/{groupMatches.length}
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-200">
                      <Check className="h-4 w-4 text-[#ff7a1a]" />
                      Clasificacion prevista
                    </div>
                    <GroupStandingTable rows={standingsByGroup.get(group) ?? []} />
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-200">
                      <Check className="h-4 w-4 text-[#ff7a1a]" />
                      Tabla real
                    </div>
                    <GroupStandingTable rows={realStandingsByGroup.get(group) ?? []} />
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div id="group-standings-panel" className="prediction-groups-collapsed">
            <span>{groupLetters.length} grupos replegados para bajar rapido a los partidos.</span>
            <a href="#partidos">Ir a partidos</a>
          </div>
        )}
      </section>

      <section id="partidos" className="glass scroll-mt-6 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[#ff7a1a]">
              Paso 2
            </p>
            <h2 className="mt-1 text-2xl font-black">Partidos</h2>
            <p className="mt-1 text-sm text-slate-300">
              Mete tu prediccion de marcador para cada partido de grupo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-200">
              {completedGroupPredictions}/{groupMatchRows.length} partidos con marcador
            </div>
            <div className="prediction-sort-control" aria-label="Ordenar partidos">
              <button
                type="button"
                onClick={() => setMatchSortMode("group")}
                className={matchSortMode === "group" ? "prediction-sort-button prediction-sort-button-active" : "prediction-sort-button"}
              >
                <Grid2X2 className="h-4 w-4" />
                Por grupos
              </button>
              <button
                type="button"
                onClick={() => setMatchSortMode("date")}
                className={matchSortMode === "date" ? "prediction-sort-button prediction-sort-button-active" : "prediction-sort-button"}
              >
                <CalendarDays className="h-4 w-4" />
                Por fecha
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {predictionSections.map((section) => (
            <section key={section.key} className="prediction-group-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">{section.title}</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                  {section.matches.length} partidos
                </span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {section.matches.map((match) => (
                  <PredictionMatchCard
                    key={match.id}
                    match={match}
                    draft={draft[match.id]}
                    disabled={locked}
                    onScoreChange={updateScore}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section id="eliminatorias" className="glass scroll-mt-6 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[#ff7a1a]">
              Paso 3
            </p>
            <h2 className="mt-1 text-2xl font-black">Eliminatorias vivas</h2>
            <p className="mt-1 text-sm text-slate-300">
              Cada clasificado alimenta la siguiente ronda. Si hay empate, marca quién pasa.
            </p>
          </div>
        </div>

        {tiebreakPrompts.length ? (
          <ManualTiebreakPanel
            prompts={tiebreakPrompts}
            draft={tiebreakDraft}
            disabled={locked}
            onChange={updateTiebreakOrder}
          />
        ) : null}

        <PredictionPosterBracket
          draft={draft}
          disabled={locked}
          knockoutByNumber={knockoutByNumber}
          knockoutIssuesByRound={knockoutIssuesByRound}
          onScoreChange={updateScore}
          onWinnerChange={updateWinner}
        />
      </section>

      <div className="space-y-3">
        <div
          className={
            visibleSaveStatus.kind === "error"
              ? "rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100"
              : visibleSaveStatus.kind === "saved"
                ? "rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100"
                : "rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-200"
          }
        >
          {visibleSaveStatus.message}
        </div>

        <button disabled={locked} className="btn-primary sticky bottom-4 z-10 w-full shadow-2xl shadow-black/30">
          <Save className="h-5 w-5" />
          Guardar apuestas
        </button>
      </div>
    </form>
  );
}

function PredictionPosterBracket({
  draft,
  disabled,
  knockoutByNumber,
  knockoutIssuesByRound,
  onScoreChange,
  onWinnerChange,
}: {
  draft: Record<string, DraftPrediction>;
  disabled: boolean;
  knockoutByNumber: Map<number, KnockoutMatch>;
  knockoutIssuesByRound: Map<string, number>;
  onScoreChange: (match: KnockoutMatch | Match, side: "home" | "away", value: string) => void;
  onWinnerChange: (matchId: string, winnerId: string) => void;
}) {
  const finalMatch = knockoutByNumber.get(104);
  const thirdPlaceMatch = knockoutByNumber.get(103);

  return (
    <div className="prediction-poster-shell mt-5">
      <div className="prediction-poster-board">
        <BracketSide
          columns={LEFT_BRACKET_COLUMNS}
          direction="left"
          draft={draft}
          disabled={disabled}
          knockoutByNumber={knockoutByNumber}
          knockoutIssuesByRound={knockoutIssuesByRound}
          onScoreChange={onScoreChange}
          onWinnerChange={onWinnerChange}
        />
        <section className="prediction-poster-center">
          <div>
            <p className="text-xs font-black uppercase text-[#ff7a1a]">Fase final</p>
            <h3>Final</h3>
          </div>
          {finalMatch ? (
            <PredictionMatchCard
              match={finalMatch}
              draft={draft[finalMatch.id]}
              disabled={disabled}
              onScoreChange={onScoreChange}
              onWinnerChange={onWinnerChange}
            />
          ) : null}
          <div className="prediction-poster-third">
            <p>3.º y 4.º puesto</p>
            {thirdPlaceMatch ? (
              <PredictionMatchCard
                match={thirdPlaceMatch}
                draft={draft[thirdPlaceMatch.id]}
                disabled={disabled}
                onScoreChange={onScoreChange}
                onWinnerChange={onWinnerChange}
              />
            ) : null}
          </div>
        </section>
        <BracketSide
          columns={RIGHT_BRACKET_COLUMNS}
          direction="right"
          draft={draft}
          disabled={disabled}
          knockoutByNumber={knockoutByNumber}
          knockoutIssuesByRound={knockoutIssuesByRound}
          onScoreChange={onScoreChange}
          onWinnerChange={onWinnerChange}
        />
      </div>
    </div>
  );
}

function ManualTiebreakPanel({
  prompts,
  draft,
  disabled,
  onChange,
}: {
  prompts: PredictionTiebreakPrompt[];
  draft: PredictionTiebreakDraft;
  disabled: boolean;
  onChange: (scopeId: string, position: number, teamId: string) => void;
}) {
  return (
    <section className="manual-tiebreak-panel mt-5">
      <div className="manual-tiebreak-header">
        <AlertCircle className="h-5 w-5 text-[#ff7a1a]" />
        <div>
          <h3>Desempates manuales</h3>
          <p>
            Aquí no metes tarjetas amarillas. Si tus resultados llegan al fair
            play, ordénalo a mano para cerrar los cruces.
          </p>
        </div>
      </div>
      <div className="manual-tiebreak-grid">
        {prompts.map((prompt) => {
          const orderedTeamIds = draft[prompt.scopeId] ?? [];
          return (
            <article key={prompt.scopeId} className="manual-tiebreak-card">
              <div className="manual-tiebreak-copy">
                <h4>{prompt.title}</h4>
                <p>{prompt.description}</p>
              </div>
              <div className="manual-tiebreak-slots">
                {prompt.teams.map((_, index) => (
                  <label key={`${prompt.scopeId}-${index}`} className="manual-tiebreak-slot">
                    <span>{index + 1}.º desempate</span>
                    <select
                      className="field"
                      disabled={disabled}
                      value={orderedTeamIds[index] ?? ""}
                      onChange={(event) =>
                        onChange(prompt.scopeId, index, event.target.value)
                      }
                    >
                      <option value="">Elige selección</option>
                      {prompt.teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BracketSide({
  columns,
  direction,
  draft,
  disabled,
  knockoutByNumber,
  knockoutIssuesByRound,
  onScoreChange,
  onWinnerChange,
}: {
  columns: readonly {
    stage: "round_32" | "round_16" | "quarter_final" | "semi_final";
    matchNumbers: readonly number[];
  }[];
  direction: "left" | "right";
  draft: Record<string, DraftPrediction>;
  disabled: boolean;
  knockoutByNumber: Map<number, KnockoutMatch>;
  knockoutIssuesByRound: Map<string, number>;
  onScoreChange: (match: KnockoutMatch | Match, side: "home" | "away", value: string) => void;
  onWinnerChange: (matchId: string, winnerId: string) => void;
}) {
  return (
    <div className={`prediction-poster-side prediction-poster-side-${direction}`}>
      {columns.map((column, index) => {
        const columnMatches = column.matchNumbers
          .map((matchNumber) => knockoutByNumber.get(matchNumber))
          .filter(Boolean) as KnockoutMatch[];
        const issueCount = knockoutIssuesByRound.get(column.stage) ?? 0;

        return (
          <section
            key={`${direction}-${column.stage}`}
            className={`prediction-poster-column prediction-poster-column-${columnMatches.length}`}
          >
            <div
              className={
                issueCount > 0
                  ? "prediction-round-title prediction-round-title-error"
                  : "prediction-round-title"
              }
            >
              <span>{STAGE_LABELS[column.stage]}</span>
            </div>
            <div className={`prediction-poster-stack prediction-poster-stack-${columnMatches.length}`}>
              {columnMatches.map((match) => (
                <div
                  key={match.id}
                  className={`prediction-poster-card-wrap ${index === columns.length - 1 ? "prediction-poster-card-wrap-final" : ""}`}
                >
                  <PredictionMatchCard
                    match={match}
                    draft={draft[match.id]}
                    disabled={disabled}
                    onScoreChange={onScoreChange}
                    onWinnerChange={onWinnerChange}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PredictionMatchCard({
  match,
  draft,
  disabled,
  onScoreChange,
  onWinnerChange,
}: {
  match: KnockoutMatch | Match;
  draft?: DraftPrediction;
  disabled: boolean;
  onScoreChange: (match: KnockoutMatch | Match, side: "home" | "away", value: string) => void;
  onWinnerChange?: (matchId: string, winnerId: string) => void;
}) {
  const homeTeam = "predictedHomeTeam" in match ? match.predictedHomeTeam : match.home_team;
  const awayTeam = "predictedAwayTeam" in match ? match.predictedAwayTeam : match.away_team;
  const homePlaceholder =
    "predictedHomeTeam" in match && match.predictedHomeTeam
      ? null
      : shortBracketPlaceholder(match.home_placeholder);
  const awayPlaceholder =
    "predictedAwayTeam" in match && match.predictedAwayTeam
      ? null
      : shortBracketPlaceholder(match.away_placeholder);
  const canPickWinner = match.stage !== "group" && homeTeam && awayTeam && onWinnerChange;
  const issues = getMatchIssues(match, draft);
  const homeIssue = hasScoreIssue(draft?.home);
  const awayIssue = hasScoreIssue(draft?.away);
  const isKnockout = match.stage !== "group";
  const homeScore = numberOrNull(draft?.home);
  const awayScore = numberOrNull(draft?.away);
  const showWinnerButtons =
    Boolean(canPickWinner) &&
    homeScore !== null &&
    awayScore !== null &&
    homeScore === awayScore;

  return (
    <article
      className={[
        "prediction-match-card",
        isKnockout ? "prediction-match-card-knockout" : "",
        issues.length ? "prediction-match-card-error" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className={issues.length ? "text-xs font-black uppercase text-red-100" : "text-xs font-black uppercase text-[#ff7a1a]"}>
            Partido {match.match_number}
          </span>
          <div className={isKnockout ? "prediction-match-date prediction-match-date-compact" : "prediction-match-date"}>
            {formatMatchDate(match.match_date)}
          </div>
        </div>
        {draft?.winnerId && canPickWinner ? (
          <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-bold text-emerald-100">
            Clasificado
          </span>
        ) : null}
      </div>

      <ScoreLine
        matchId={match.id}
        side="home"
        team={homeTeam}
        placeholder={homePlaceholder}
        value={draft?.home ?? ""}
        hasError={homeIssue}
        compactTeamCode={isKnockout}
        disabled={disabled}
        onChange={(value) => onScoreChange(match, "home", value)}
      />
      <ScoreLine
        matchId={match.id}
        side="away"
        team={awayTeam}
        placeholder={awayPlaceholder}
        value={draft?.away ?? ""}
        hasError={awayIssue}
        compactTeamCode={isKnockout}
        disabled={disabled}
        onChange={(value) => onScoreChange(match, "away", value)}
      />

      {showWinnerButtons && homeTeam && awayTeam && onWinnerChange ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[homeTeam, awayTeam].map((team) => (
            <button
              key={team.id}
              type="button"
              disabled={disabled}
              onClick={() => onWinnerChange(match.id, team.id)}
              className={
                draft?.winnerId === team.id
                  ? "prediction-winner-button prediction-winner-button-active"
                  : "prediction-winner-button"
              }
            >
              {team.short_name}
            </button>
          ))}
        </div>
      ) : null}

      {issues.length ? (
        <div className="prediction-error-message">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{issues[0]}</span>
        </div>
      ) : null}
    </article>
  );
}

function ScoreLine({
  matchId,
  side,
  team,
  placeholder,
  value,
  hasError,
  compactTeamCode,
  disabled,
  onChange,
}: {
  matchId: string;
  side: "home" | "away";
  team?: Team | null;
  placeholder?: string | null;
  value: string;
  hasError: boolean;
  compactTeamCode?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={hasError ? "prediction-score-line prediction-score-line-error" : "prediction-score-line"}>
      <span className="min-w-0 text-sm">
        {compactTeamCode && team ? (
          <CompactTeamCode team={team} />
        ) : team ? (
          <TeamBadge team={team} />
        ) : (
          <MatchTeamLabel placeholder={placeholder} />
        )}
      </span>
      <input
        name={`${side}_${matchId}`}
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={hasError ? "prediction-score-input prediction-score-input-error" : "prediction-score-input"}
        aria-label={`${side === "home" ? "Local" : "Visitante"} ${team?.name ?? placeholder ?? ""}`}
      />
    </label>
  );
}

function CompactTeamCode({ team }: { team: Team }) {
  const flagUrl = getTeamFlagImageUrl(team);

  return (
    <span className="prediction-team-code">
      {flagUrl ? (
        <span
          aria-hidden="true"
          className="prediction-team-code-flag"
          style={{ backgroundImage: `url("${flagUrl}")` }}
        />
      ) : (
        <span className="shrink-0">{team.flag_emoji}</span>
      )}
      <span>{team.short_name}</span>
    </span>
  );
}

function buildKnockoutMatches(
  matches: Match[],
  standingsByGroup: Map<string, StandingRow[]>,
  thirdPlaceAssignments: ReturnType<typeof getThirdPlaceAssignments>,
  draft: Record<string, DraftPrediction>,
  completedGroups: Set<string>,
  allGroupsPredicted: boolean,
) {
  const byNumber = new Map(matches.map((match) => [match.match_number ?? 0, match]));
  const derived = new Map<number, KnockoutMatch>();
  const resolvedThirdPlaceAssignments = allGroupsPredicted
    ? thirdPlaceAssignments
    : null;

  Object.entries(ROUND_32_SLOTS).forEach(([numberText, [homeSlot, awaySlot]]) => {
    const number = Number(numberText);
    const match = byNumber.get(number);
    if (!match) return;
    derived.set(number, {
      ...match,
      predictedHomeTeam:
        match.home_team ??
        resolveGroupSlot(
          homeSlot,
          awaySlot,
          standingsByGroup,
          resolvedThirdPlaceAssignments,
          completedGroups,
          allGroupsPredicted,
        ),
      predictedAwayTeam:
        match.away_team ??
        resolveGroupSlot(
          awaySlot,
          homeSlot,
          standingsByGroup,
          resolvedThirdPlaceAssignments,
          completedGroups,
          allGroupsPredicted,
        ),
    });
  });

  Object.entries(WINNER_SLOTS).forEach(([numberText, [homeSource, awaySource]]) => {
    const number = Number(numberText);
    const match = byNumber.get(number);
    const homeMatch = derived.get(homeSource);
    const awayMatch = derived.get(awaySource);
    if (!match) return;
    derived.set(number, {
      ...match,
      predictedHomeTeam: match.home_team ?? (homeMatch ? resolveWinner(homeMatch, draft[homeMatch.id]) : null),
      predictedAwayTeam: match.away_team ?? (awayMatch ? resolveWinner(awayMatch, draft[awayMatch.id]) : null),
    });
  });

  Object.entries(LOSER_SLOTS).forEach(([numberText, [homeSource, awaySource]]) => {
    const number = Number(numberText);
    const match = byNumber.get(number);
    const homeMatch = derived.get(homeSource);
    const awayMatch = derived.get(awaySource);
    if (!match) return;
    derived.set(number, {
      ...match,
      predictedHomeTeam: match.home_team ?? (homeMatch ? resolveLoser(homeMatch, draft[homeMatch.id]) : null),
      predictedAwayTeam: match.away_team ?? (awayMatch ? resolveLoser(awayMatch, draft[awayMatch.id]) : null),
    });
  });

  return Array.from(derived.values()).sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));
}

function resolveGroupSlot(
  slot: string,
  pairedSlot: string,
  standingsByGroup: Map<string, StandingRow[]>,
  thirdPlaceAssignments: ReturnType<typeof getThirdPlaceAssignments>,
  completedGroups: Set<string>,
  allGroupsPredicted: boolean,
) {
  const position = Number(slot[0]);
  if (position === 1 || position === 2) {
    const group = slot[1];
    if (!completedGroups.has(group)) return null;
    return standingsByGroup.get(group)?.[position - 1]?.team ?? null;
  }

  if (!allGroupsPredicted || !thirdPlaceAssignments || !pairedSlot.startsWith("1")) {
    return null;
  }

  return thirdPlaceAssignments.get(pairedSlot)?.team ?? null;
}

function resolveWinner(match: KnockoutMatch, draft?: DraftPrediction) {
  const homeScore = numberOrNull(draft?.home);
  const awayScore = numberOrNull(draft?.away);
  if (draft?.winnerId === match.predictedHomeTeam?.id) return match.predictedHomeTeam;
  if (draft?.winnerId === match.predictedAwayTeam?.id) return match.predictedAwayTeam;
  if (homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) return match.predictedHomeTeam ?? null;
    if (awayScore > homeScore) return match.predictedAwayTeam ?? null;
  }
  return null;
}

function resolveLoser(match: KnockoutMatch, draft?: DraftPrediction) {
  const winner = resolveWinner(match, draft);
  if (!winner) return null;
  if (winner.id === match.predictedHomeTeam?.id) return match.predictedAwayTeam ?? null;
  if (winner.id === match.predictedAwayTeam?.id) return match.predictedHomeTeam ?? null;
  return null;
}

function numberOrNull(value?: string) {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && Number.isInteger(parsed) ? parsed : null;
}

function buildPredictionFormData(
  leagueId: string,
  matches: Match[],
  draft: Record<string, DraftPrediction>,
  tiebreakDraft: PredictionTiebreakDraft,
) {
  const formData = new FormData();
  formData.set("league_id", leagueId);
  formData.set("match_ids", matches.map((match) => match.id).join(","));
  formData.set("tiebreak_selections", JSON.stringify(tiebreakDraft));

  matches.forEach((match) => {
    const prediction = draft[match.id];
    formData.set(`home_${match.id}`, prediction?.home ?? "");
    formData.set(`away_${match.id}`, prediction?.away ?? "");
    formData.set(`winner_${match.id}`, prediction?.winnerId ?? "");
  });

  return formData;
}

function serializeDraftSnapshot(
  matches: Match[],
  draft: Record<string, DraftPrediction>,
  tiebreakDraft: PredictionTiebreakDraft,
) {
  const matchSnapshot = matches
    .map((match) => {
      const prediction = draft[match.id];
      return [
        match.id,
        prediction?.home ?? "",
        prediction?.away ?? "",
        prediction?.winnerId ?? "",
      ].join(":");
    })
    .join("|");
  const tiebreakSnapshot = Object.entries(tiebreakDraft)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scopeId, orderedTeamIds]) => `${scopeId}:${orderedTeamIds.join(",")}`)
    .join("|");
  return `${matchSnapshot}__${tiebreakSnapshot}`;
}

function formatSaveTime(value: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(value);
}

function formatMatchDate(value: string | null) {
  if (!value) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    timeZone: "Europe/Madrid",
    weekday: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatMatchDay(value: string | null) {
  if (!value) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "full",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function shortBracketPlaceholder(value?: string | null) {
  if (!value) return value;
  return value
    .replace(/Ganador partido\s+(\d+)/i, "Ganador P$1")
    .replace(/Perdedor partido\s+(\d+)/i, "Perdedor P$1");
}

function hasScoreIssue(value?: string) {
  if (value === undefined || value === "") return true;
  return numberOrNull(value) === null;
}

function getMatchIssues(match: KnockoutMatch | Match, draft?: DraftPrediction) {
  const issues: string[] = [];
  const homeTeam = "predictedHomeTeam" in match ? match.predictedHomeTeam : match.home_team;
  const awayTeam = "predictedAwayTeam" in match ? match.predictedAwayTeam : match.away_team;
  const homeScore = numberOrNull(draft?.home);
  const awayScore = numberOrNull(draft?.away);

  if (match.stage !== "group" && (!homeTeam || !awayTeam)) {
    return ["Falta completar cruces anteriores."];
  }
  const resolvedHomeTeam = homeTeam;
  const resolvedAwayTeam = awayTeam;

  if (!draft?.home || !draft?.away) {
    issues.push("Falta poner el resultado completo.");
  } else if (homeScore === null || awayScore === null) {
    issues.push("El marcador debe ser un número entero de 0 o más.");
  }

  if (match.stage !== "group") {
    if (homeScore !== null && awayScore !== null) {
      if (!resolvedHomeTeam || !resolvedAwayTeam) return issues;
      const validWinners = [resolvedHomeTeam.id, resolvedAwayTeam.id];
      if (homeScore === awayScore && !draft?.winnerId) {
        issues.push("Hay empate: elige quién pasa.");
      }
      if (draft?.winnerId && !validWinners.includes(draft.winnerId)) {
        issues.push("El clasificado no coincide con este cruce.");
      }
      if (homeScore > awayScore && draft?.winnerId && draft.winnerId !== resolvedHomeTeam.id) {
        issues.push("El clasificado no coincide con el marcador.");
      }
      if (awayScore > homeScore && draft?.winnerId && draft.winnerId !== resolvedAwayTeam.id) {
        issues.push("El clasificado no coincide con el marcador.");
      }
    }
  }

  return issues;
}


