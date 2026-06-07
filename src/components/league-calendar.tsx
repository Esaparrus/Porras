"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { CalendarMatchLink, getMadridDateKey, type CalendarMatch } from "@/components/match-calendar";
import { cn } from "@/lib/utils";

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
    setOpenPanelId((current) => {
      const next = current === panelId ? null : panelId;
      history.replaceState(null, "", next ? `#${next}` : window.location.pathname);
      return next;
    });
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
                        return <div key={`${month.title}-empty-${weekIndex}-${dayIndex}`} aria-hidden="true" />;
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
                            "flex min-h-20 rounded-2xl border border-white/10 bg-black/20 p-2 text-left transition sm:min-h-24 sm:p-3",
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
