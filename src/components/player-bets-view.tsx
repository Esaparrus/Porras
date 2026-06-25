"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Grid2X2, ListTree, Star, Trophy } from "lucide-react";
import {
  GroupStandingTable,
  MatchTeamLabel,
  PlayerBadge,
  ScoreBreakdownCard,
  TeamBadge,
} from "@/components/ui";
import { STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Player, Score, Stage, StandingRow, Team } from "@/lib/types";

export type BetMatch = {
  id: string;
  matchNumber: number | null;
  stage: Stage;
  groupLetter: string | null;
  matchDate: string | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  predictedHome: number | null;
  predictedAway: number | null;
  advanceTeam: Team | null;
  isFinished: boolean;
  realHome: number | null;
  realAway: number | null;
  points: number;
};

type ScorerBet = {
  player: Player;
  goals: number;
  points: number;
};

type Group = {
  letter: string;
  standings: StandingRow[];
  matches: BetMatch[];
  isCompleted: boolean;
  points: number;
};

type KnockoutRound = {
  stage: Stage;
  matches: BetMatch[];
};

type Awards = {
  topScorer: Player | null;
  bestPlayer: Player | null;
  bestGoalkeeper: Player | null;
  bestYoung: Player | null;
};

type Tab = "grupos" | "eliminatorias" | "goleadores" | "premios";

const PANEL =
  "rounded-2xl border border-white/10 bg-[#07111f]/90 shadow-2xl shadow-black/30 backdrop-blur-xl";

export function PlayerBetsView({
  displayName,
  avatarEmoji,
  score,
  groups,
  groupMatches,
  knockoutRounds,
  champion,
  scorers,
  scorerMaxPoints,
  resultsStarted,
  awards,
}: {
  displayName: string;
  avatarEmoji: string | null;
  score: Score | null;
  groups: Group[];
  groupMatches: BetMatch[];
  knockoutRounds: KnockoutRound[];
  champion: Team | null;
  scorers: ScorerBet[];
  scorerMaxPoints: number;
  resultsStarted: boolean;
  awards: Awards;
}) {
  const [tab, setTab] = useState<Tab>("grupos");

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "grupos", label: "Grupos", count: groupMatches.length },
    {
      key: "eliminatorias",
      label: "Eliminatorias",
      count: knockoutRounds.reduce((total, round) => total + round.matches.length, 0),
    },
    { key: "goleadores", label: "Goleadores", count: scorers.length },
    {
      key: "premios",
      label: "Premios",
      count: [awards.topScorer, awards.bestPlayer, awards.bestGoalkeeper, awards.bestYoung].filter(
        Boolean,
      ).length,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatarEmoji ? <span className="text-4xl leading-none">{avatarEmoji}</span> : null}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#27e7ff] [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
              Apuestas de
            </p>
            <h1 className="text-3xl font-black [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
              {displayName}
            </h1>
          </div>
        </div>
        {score ? (
          <div className={cn(PANEL, "px-5 py-3 text-right")}>
            <div className="text-3xl font-black text-white">{score.total_points}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              puntos totales
            </div>
          </div>
        ) : null}
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-wide transition",
              tab === item.key
                ? "border-[#ff2bd6] bg-[#ff2bd6] text-white shadow-[3px_3px_0_#000]"
                : "border-white/15 bg-[#07111f]/80 text-slate-200 hover:border-[#27e7ff]/60 hover:text-white",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px]",
                tab === item.key ? "bg-black/30 text-white" : "bg-white/10 text-slate-300",
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </nav>

      {tab === "grupos" ? (
        <GroupsTab groups={groups} groupMatches={groupMatches} />
      ) : null}
      {tab === "eliminatorias" ? (
        <KnockoutTab rounds={knockoutRounds} champion={champion} />
      ) : null}
      {tab === "goleadores" ? (
        <ScorersTab
          scorers={scorers}
          maxPoints={scorerMaxPoints}
          resultsStarted={resultsStarted}
        />
      ) : null}
      {tab === "premios" ? <AwardsTab awards={awards} score={score} /> : null}
    </div>
  );
}

function GroupsTab({ groups, groupMatches }: { groups: Group[]; groupMatches: BetMatch[] }) {
  const [mode, setMode] = useState<"grupos" | "fecha">("grupos");

  const byDate = useMemo(() => groupMatchesByDay(groupMatches), [groupMatches]);

  if (!groupMatches.length) {
    return <EmptyPanel text="Este jugador no ha apostado ningún partido de la fase de grupos." />;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ToggleButton active={mode === "grupos"} onClick={() => setMode("grupos")}>
          <Grid2X2 className="h-4 w-4" /> Por grupos
        </ToggleButton>
        <ToggleButton active={mode === "fecha"} onClick={() => setMode("fecha")}>
          <CalendarDays className="h-4 w-4" /> Por fecha
        </ToggleButton>
      </div>

      {mode === "grupos" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.letter} className={cn(PANEL, "p-4")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Grupo {group.letter}</h2>
                {group.isCompleted ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black tabular-nums",
                      group.points > 0
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-white/5 text-slate-500",
                    )}
                  >
                    {group.points > 0 ? `+${group.points}` : "0"} pts
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                    {group.matches.length} partidos
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#27e7ff]">
                  Clasificación que prevé
                </div>
                <GroupStandingTable rows={group.standings} showBestThirdBadge={!group.isCompleted} />
              </div>
              <div className="mt-3 grid gap-2">
                {group.matches.map((match) => (
                  <BetMatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {byDate.map((day) => (
            <div key={day.label} className={cn(PANEL, "p-4")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-black capitalize">{day.label}</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                  {day.matches.length} partidos
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {day.matches.map((match) => (
                  <BetMatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function KnockoutTab({ rounds, champion }: { rounds: KnockoutRound[]; champion: Team | null }) {
  if (!rounds.length) {
    return <EmptyPanel text="Todavía no hay eliminatorias que mostrar." />;
  }

  return (
    <section className="space-y-4">
      {champion ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#f6c344]/40 bg-[#f6c344]/10 p-4">
          <Trophy className="h-7 w-7 text-[#f6c344]" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f6c344]">
              Campeón apostado
            </p>
            <div className="mt-1 text-xl font-black">
              <TeamBadge team={champion} />
            </div>
          </div>
        </div>
      ) : null}

      {rounds.map((round) => (
        <div key={round.stage} className={cn(PANEL, "p-4")}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">{STAGE_LABELS[round.stage] ?? round.stage}</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              {round.matches.length} cruces
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {round.matches.map((match) => (
              <BetMatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ScorersTab({
  scorers,
  maxPoints,
  resultsStarted,
}: {
  scorers: ScorerBet[];
  maxPoints: number;
  resultsStarted: boolean;
}) {
  if (!scorers.length) {
    return <EmptyPanel text="Este jugador no ha elegido goleadores." />;
  }
  const rawTotal = scorers.reduce((total, scorer) => total + scorer.points, 0);
  const cappedTotal = Math.min(rawTotal, maxPoints);
  return (
    <div className={cn(PANEL, "p-5")}>
      <h2 className="flex items-center gap-2 text-xl font-black">
        <ListTree className="h-5 w-5 text-[#27e7ff]" /> Goleadores apostados
      </h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {scorers.map((scorer) => (
          <div
            key={scorer.player.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
          >
            <PlayerBadge player={scorer.player} />
            {resultsStarted ? (
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold text-slate-300">
                  {scorer.goals} {scorer.goals === 1 ? "gol" : "goles"}
                </div>
                <div
                  className={cn(
                    "text-sm font-black tabular-nums",
                    scorer.points > 0 ? "text-emerald-300" : "text-slate-500",
                  )}
                >
                  {scorer.points > 0 ? `+${scorer.points}` : "0"} pts
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {resultsStarted ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">
          <span>Total goleadores</span>
          <span>
            {cappedTotal} pts
            {rawTotal > maxPoints ? (
              <span className="ml-1 text-xs font-bold text-emerald-200/70">
                (tope {maxPoints})
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function AwardsTab({ awards, score }: { awards: Awards; score: Score | null }) {
  const rows: Array<{ label: string; icon: string; player: Player | null }> = [
    { label: "Pichichi", icon: "⚽", player: awards.topScorer },
    { label: "Mejor jugador", icon: "🌟", player: awards.bestPlayer },
    { label: "Mejor portero", icon: "🧤", player: awards.bestGoalkeeper },
    { label: "Mejor joven", icon: "🧒", player: awards.bestYoung },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
      <div className={cn(PANEL, "p-5")}>
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Star className="h-5 w-5 text-[#f6c344]" /> Premios apostados
        </h2>
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3"
            >
              <span className="text-sm font-black uppercase tracking-wide text-slate-300">
                {row.icon} {row.label}
              </span>
              <PlayerBadge player={row.player} />
            </div>
          ))}
        </div>
      </div>
      <ScoreBreakdownCard score={score} />
    </div>
  );
}

function BetMatchCard({ match }: { match: BetMatch }) {
  const hasBet = match.predictedHome !== null && match.predictedAway !== null;
  const isKnockout = match.stage !== "group";
  const hasReal = match.isFinished && match.realHome !== null && match.realAway !== null;

  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-400">
        <span>{match.matchNumber ? `Partido ${match.matchNumber}` : STAGE_LABELS[match.stage]}</span>
        <span>{formatMatchDate(match.matchDate)}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 justify-end text-right text-sm">
          <MatchTeamLabel team={match.homeTeam} placeholder={match.homePlaceholder} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              "rounded-lg px-3 py-1.5 text-center font-black tabular-nums",
              hasBet ? "bg-[#ff2bd6]/20 text-white" : "bg-white/5 text-slate-500",
            )}
          >
            {hasBet ? `${match.predictedHome} - ${match.predictedAway}` : "— - —"}
          </div>
          {hasReal ? (
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Real{" "}
              <span className="tabular-nums text-slate-200">
                {match.realHome} - {match.realAway}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 text-sm">
          <MatchTeamLabel team={match.awayTeam} placeholder={match.awayPlaceholder} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        {isKnockout && match.advanceTeam ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-200">
            Pasa: {match.advanceTeam.short_name}
          </span>
        ) : null}
        {hasReal ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black tabular-nums",
              match.points > 0
                ? "bg-emerald-400/15 text-emerald-200"
                : "bg-white/5 text-slate-500",
            )}
          >
            {match.points > 0 ? `+${match.points}` : "0"} pts
          </span>
        ) : null}
      </div>
    </article>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
        active
          ? "border-[#27e7ff] bg-[#27e7ff]/15 text-white"
          : "border-white/15 bg-[#07111f]/70 text-slate-300 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className={cn(PANEL, "p-8 text-center text-slate-300")}>{text}</div>
  );
}

function groupMatchesByDay(matches: BetMatch[]) {
  const byDay = new Map<string, BetMatch[]>();
  matches.forEach((match) => {
    const label = formatMatchDay(match.matchDate);
    byDay.set(label, [...(byDay.get(label) ?? []), match]);
  });
  return Array.from(byDay, ([label, dayMatches]) => ({ label, matches: dayMatches }));
}

function formatMatchDay(value: string | null) {
  if (!value) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "full",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function formatMatchDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}
