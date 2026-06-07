import Link from "next/link";
import { ChevronDown, Clock3 } from "lucide-react";
import type { Match, MatchPrediction, Team } from "@/lib/types";
import { cn, getTeamFlagImageUrl } from "@/lib/utils";

type CalendarMatch = Match & {
  prediction?: MatchPrediction | null;
};

type CalendarMonth = {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  weeks: Array<Array<CalendarDay | null>>;
};

type CalendarDay = {
  key: string;
  dayNumber: number;
  matches: CalendarMatch[];
};

const MADRID_TIME_ZONE = "Europe/Madrid";
const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export function MatchCalendar({
  leagueId,
  months,
}: {
  leagueId: string;
  months: CalendarMonth[];
}) {
  return (
    <div className="space-y-8">
      {months.map((month) => (
        <section key={month.key} className="glass rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#27e7ff]">
                Vista mensual
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{month.label}</h2>
            </div>
            <div className="rounded-full border border-[#ff2bd6]/35 bg-[#ff2bd6]/12 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffc1f3]">
              Punto rosa = hay partido
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-black/15 px-2 py-3">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-2 space-y-2">
            {month.weeks.map((week, weekIndex) => (
              <div key={`${month.key}-${weekIndex}`} className="grid grid-cols-7 gap-2">
                {week.map((day, dayIndex) =>
                  day ? (
                    <CalendarDayCell key={day.key} leagueId={leagueId} day={day} />
                  ) : (
                    <div
                      key={`${month.key}-empty-${weekIndex}-${dayIndex}`}
                      className="min-h-[108px] rounded-[1.35rem] border border-dashed border-white/8 bg-black/10"
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CalendarDayCell({
  leagueId,
  day,
}: {
  leagueId: string;
  day: CalendarDay;
}) {
  const hasMatches = day.matches.length > 0;

  if (!hasMatches) {
    return (
      <div className="min-h-[108px] rounded-[1.35rem] border border-white/8 bg-black/10 p-3 text-sm text-slate-400">
        <div className="font-black text-slate-500">{day.dayNumber}</div>
      </div>
    );
  }

  return (
    <details className="group min-h-[108px] rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.18)] open:border-[#ff2bd6]/45 open:bg-[linear-gradient(180deg,rgba(255,43,214,0.15),rgba(255,255,255,0.05))]">
      <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-black text-white">{day.dayNumber}</div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#ff2bd6]/35 bg-[#ff2bd6]/14 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd2f7]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff2bd6]" />
              {day.matches.length} partido{day.matches.length === 1 ? "" : "s"}
            </div>
          </div>
          <ChevronDown className="mt-0.5 h-4 w-4 text-slate-300 transition group-open:rotate-180" />
        </div>
      </summary>

      <div className="mt-3 space-y-2">
        {day.matches.map((match) => (
          <Link
            key={match.id}
            href={`/league/${leagueId}/calendar/${match.id}`}
            className="block rounded-2xl border border-white/10 bg-black/20 p-2 transition hover:border-[#27e7ff]/45 hover:bg-[#27e7ff]/10"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#ffcf9f]">
                <Clock3 className="h-3.5 w-3.5" />
                {formatMatchTime(match.match_date)}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                {getStageShortLabel(match.stage)}
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              <CompactTeamRow team={match.home_team} placeholder={match.home_placeholder} />
              <CompactTeamRow team={match.away_team} placeholder={match.away_placeholder} />
            </div>
            <div className="mt-2 rounded-xl border border-[#27e7ff]/18 bg-[#07111f]/70 px-2 py-1.5 text-center text-[11px] font-black text-[#27e7ff]">
              Tu resultado: {formatPredictionScore(match.prediction)}
            </div>
          </Link>
        ))}
      </div>
    </details>
  );
}

function CompactTeamRow({
  team,
  placeholder,
}: {
  team?: Team | null;
  placeholder?: string | null;
}) {
  const flagUrl = getTeamFlagImageUrl(team);

  return (
    <div className="flex items-center gap-2 text-sm font-black text-white">
      {team ? (
        flagUrl ? (
          <span
            aria-hidden="true"
            className="h-4 w-6 shrink-0 rounded-[2px] bg-cover bg-center shadow-sm shadow-black/30"
            style={{ backgroundImage: `url("${flagUrl}")` }}
          />
        ) : (
          <span className="shrink-0">{team.flag_emoji}</span>
        )
      ) : (
        <span className="inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-[2px] bg-white/10 text-[9px] text-slate-400">
          ?
        </span>
      )}
      <span className="truncate">{team?.name ?? placeholder ?? "Por definir"}</span>
    </div>
  );
}

export function buildCalendarMonths(matches: CalendarMatch[]) {
  const groupedMatches = new Map<string, CalendarMatch[]>();

  for (const match of matches) {
    if (!match.match_date) continue;
    const key = getMadridDayKey(match.match_date);
    const rows = groupedMatches.get(key) ?? [];
    rows.push(match);
    rows.sort(compareMatchTimes);
    groupedMatches.set(key, rows);
  }

  const availableMonthKeys = new Set(
    matches
      .map((match) => match.match_date)
      .filter(Boolean)
      .map((matchDate) => getMadridMonthKey(matchDate as string)),
  );
  const firstMatchDate = matches.find((match) => match.match_date)?.match_date;
  const fallbackYear = firstMatchDate
    ? Number(getDateParts(firstMatchDate).year)
    : 2026;

  const requestedMonths = [`${fallbackYear}-06`, `${fallbackYear}-07`];

  return requestedMonths
    .filter((monthKey) => availableMonthKeys.has(monthKey) || monthKey.endsWith("-06") || monthKey.endsWith("-07"))
    .map((monthKey) => {
      const [yearText, monthText] = monthKey.split("-");
      const year = Number(yearText);
      const monthIndex = Number(monthText) - 1;
      const label = new Intl.DateTimeFormat("es-ES", {
        month: "long",
        year: "numeric",
        timeZone: MADRID_TIME_ZONE,
      }).format(new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0)));

      return {
        key: monthKey,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        year,
        monthIndex,
        weeks: buildCalendarWeeks(year, monthIndex, groupedMatches),
      };
    });
}

function buildCalendarWeeks(
  year: number,
  monthIndex: number,
  groupedMatches: Map<string, CalendarMatch[]>,
) {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const leadingEmptyCells = (startWeekday + 6) % 7;
  const cells: Array<CalendarDay | null> = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push(null);
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    cells.push({
      key,
      dayNumber,
      matches: groupedMatches.get(key) ?? [],
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Array<Array<CalendarDay | null>> = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

function compareMatchTimes(left: CalendarMatch, right: CalendarMatch) {
  return new Date(left.match_date ?? 0).getTime() - new Date(right.match_date ?? 0).getTime();
}

function getDateParts(value: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: MADRID_TIME_ZONE,
  });
  const parts = formatter.formatToParts(new Date(value));

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    year: parts.find((part) => part.type === "year")?.value ?? "2026",
  };
}

function getMadridDayKey(value: string) {
  const { year, month, day } = getDateParts(value);
  return `${year}-${month}-${day}`;
}

function getMadridMonthKey(value: string) {
  const { year, month } = getDateParts(value);
  return `${year}-${month}`;
}

function formatMatchTime(value: string | null) {
  if (!value) return "Hora por confirmar";
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MADRID_TIME_ZONE,
  }).format(new Date(value));
}

function formatPredictionScore(prediction?: MatchPrediction | null) {
  if (
    !prediction ||
    prediction.predicted_home_score === null ||
    prediction.predicted_away_score === null
  ) {
    return "--";
  }

  return `${prediction.predicted_home_score} - ${prediction.predicted_away_score}`;
}

function getStageShortLabel(stage: Match["stage"]) {
  const labels: Record<Match["stage"], string> = {
    group: "Grupos",
    round_32: "1/32",
    round_16: "1/16",
    quarter_final: "1/4",
    semi_final: "Semi",
    third_place: "3er puesto",
    final: "Final",
  };

  return labels[stage];
}

export function PredictionScorePill({
  homeScore,
  awayScore,
  large = false,
  className,
}: {
  homeScore: number | null | undefined;
  awayScore: number | null | undefined;
  large?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-[1.15rem] border border-[#ff2bd6]/25 bg-[#ff2bd6]/12 font-black text-white",
        large ? "min-w-[132px] px-6 py-4 text-3xl" : "min-w-[74px] px-3 py-2 text-sm",
        className,
      )}
    >
      {homeScore ?? "-"} <span className="mx-2 text-[#ff9deb]">-</span> {awayScore ?? "-"}
    </div>
  );
}
