 "use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { STAGE_LABELS } from "@/lib/constants";
import { MatchTeamLabel } from "@/components/ui";
import type { Match, MatchPrediction } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CalendarMatch = Match & {
  myPrediction?: MatchPrediction | null;
};

type CalendarCell = {
  day: number;
  key: string;
};

const MONTHS = [
  { month: 5, title: "Junio" },
  { month: 6, title: "Julio" },
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function LeagueCalendar({
  leagueId,
  matches,
}: {
  leagueId: string;
  matches: CalendarMatch[];
}) {
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const matchesByDay = groupMatchesByDay(matches);

  function togglePanel(panelId: string) {
    const next = openPanelId === panelId ? null : panelId;
    setOpenPanelId(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", next ? `#${next}` : window.location.pathname);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {MONTHS.map((month) => (
        <section key={month.title} className="glass rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">{month.title}</h2>
              <p className="mt-1 text-sm text-slate-300">Mundial 2026</p>
            </div>
            <CalendarDays className="h-7 w-7 text-[#ff2bd6]" />
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase text-slate-300">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday}>{weekday}</div>
            ))}
          </div>

          <div className="mt-2 space-y-2">
            {buildCalendarWeeks(2026, month.month).map((week, weekIndex) => {
              const openCell = week.find(
                (cell) => cell && openPanelId === getPanelId(month.title, cell.day),
              );
              const openMatches = openCell ? matchesByDay.get(openCell.key) ?? [] : [];

              return (
                <div key={`${month.title}-week-${weekIndex}`} className="space-y-2">
                  <div className="grid grid-cols-7 gap-2">
                    {week.map((cell, dayIndex) => {
                      if (!cell) {
                        return (
                          <div
                            key={`${month.title}-empty-${weekIndex}-${dayIndex}`}
                            aria-hidden="true"
                          />
                        );
                      }

                      const dayMatches = matchesByDay.get(cell.key) ?? [];
                      const panelId = getPanelId(month.title, cell.day);
                      const isOpen = openPanelId === panelId;

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          aria-controls={panelId}
                          aria-expanded={isOpen}
                          disabled={!dayMatches.length}
                          onClick={() => togglePanel(panelId)}
                          className={cn(
                            "flex min-h-18 rounded-2xl border border-white/10 bg-black/20 p-2 text-left transition sm:min-h-24 sm:p-3",
                            dayMatches.length
                              ? "hover:border-[#ff2bd6]/60 hover:bg-black/30"
                              : "cursor-default opacity-60",
                            isOpen && "border-[#ff2bd6] bg-black/40 shadow-[0_0_0_2px_#ff2bd6]",
                          )}
                        >
                          <span className="flex w-full flex-col justify-between">
                            <span className="text-sm font-black text-white sm:text-base">{cell.day}</span>
                            {dayMatches.length ? (
                              <span className="flex items-center justify-between gap-2">
                                <span className="inline-flex h-3 w-3 rounded-full bg-[#ff2bd6] shadow-[0_0_14px_#ff2bd6]" />
                                <span className="text-[10px] font-black uppercase text-[#27e7ff]">
                                  {dayMatches.length}
                                </span>
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {openCell && openMatches.length ? (
                    <section
                      id={getPanelId(month.title, openCell.day)}
                      className="scroll-mt-4 space-y-2 rounded-2xl border border-[#ff2bd6]/35 bg-black/35 p-2 sm:p-3"
                    >
                      <div className="px-1 text-xs font-black uppercase text-slate-300">
                        Dia {openCell.day}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {openMatches.map((match) => (
                          <CalendarMatchLink key={match.id} leagueId={leagueId} match={match} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CalendarMatchLink({
  leagueId,
  match,
}: {
  leagueId: string;
  match: CalendarMatch;
}) {
  const prediction = formatPrediction(match.myPrediction);

  return (
    <Link
      href={`/league/${leagueId}/calendar/${match.id}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.06] p-3 transition hover:border-[#27e7ff]/70 hover:bg-[#27e7ff]/10"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-black uppercase text-slate-300">
        <span>{STAGE_LABELS[match.stage] ?? match.stage}</span>
        <span className="inline-flex items-center gap-1 text-[#27e7ff]">
          <Clock className="h-3.5 w-3.5" />
          {formatMatchTime(match.match_date)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs">
        <div className="min-w-0 text-right">
          <MatchTeamLabel team={match.home_team} placeholder={match.home_placeholder} />
        </div>
        <div className="rounded-xl bg-black/35 px-2 py-1 text-center font-black text-[#ff2bd6]">
          {prediction}
        </div>
        <div className="min-w-0">
          <MatchTeamLabel team={match.away_team} placeholder={match.away_placeholder} />
        </div>
      </div>
    </Link>
  );
}

function getPanelId(monthTitle: string, day: number) {
  return `${monthTitle.toLowerCase()}-${day}-partidos`;
}

function groupMatchesByDay(matches: CalendarMatch[]) {
  return matches.reduce<Map<string, CalendarMatch[]>>((groups, match) => {
    const key = getMadridDateKey(match.match_date);
    if (!key) return groups;

    const current = groups.get(key) ?? [];
    current.push(match);
    groups.set(
      key,
      current.sort((left, right) => (left.match_date ?? "").localeCompare(right.match_date ?? "")),
    );
    return groups;
  }, new Map());
}

function buildCalendarWeeks(year: number, month: number): Array<Array<CalendarCell | null>> {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const blanks: null[] = Array.from({ length: mondayOffset }, () => null);
  const days: CalendarCell[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { day, key };
  });

  const cells: Array<CalendarCell | null> = [...blanks, ...days];
  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  const paddedCells = [...cells, ...Array.from({ length: trailingBlanks }, () => null)];

  return Array.from({ length: paddedCells.length / 7 }, (_, index) =>
    paddedCells.slice(index * 7, index * 7 + 7),
  );
}

function getMadridDateKey(value?: string | null) {
  if (!value) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Madrid",
    year: "numeric",
  }).formatToParts(new Date(value));
  const partByType = new Map(parts.map((part) => [part.type, part.value]));
  return `${partByType.get("year")}-${partByType.get("month")}-${partByType.get("day")}`;
}

function formatMatchTime(value?: string | null) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function formatPrediction(prediction?: MatchPrediction | null) {
  if (
    !prediction ||
    prediction.predicted_home_score === null ||
    prediction.predicted_away_score === null
  ) {
    return "-";
  }

  return `${prediction.predicted_home_score}-${prediction.predicted_away_score}`;
}
