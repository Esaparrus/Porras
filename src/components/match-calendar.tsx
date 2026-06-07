import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { STAGE_LABELS } from "@/lib/constants";
import type { Match, MatchPrediction, Profile } from "@/lib/types";
import { MatchTeamLabel, TeamBadge } from "@/components/ui";

export type CalendarMatch = Match & {
  myPrediction?: MatchPrediction | null;
};

type PredictionWithProfile = MatchPrediction & {
  profiles?: Pick<Profile, "display_name" | "username"> | null;
};

export function CalendarMatchLink({
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
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
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

export function MatchPredictionHero({
  title,
  match,
  prediction,
}: {
  title: string;
  match: Match;
  prediction?: MatchPrediction | null;
}) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="text-sm font-black uppercase tracking-wide text-[#27e7ff]">{title}</div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0 text-right">
          <TeamBadge team={match.home_team} />
        </div>
        <div className="min-w-24 rounded-2xl border-4 border-black bg-[#ff2bd6] px-4 py-3 text-center text-3xl font-black text-white shadow-[6px_6px_0_#000]">
          {formatPrediction(prediction)}
        </div>
        <div className="min-w-0">
          <TeamBadge team={match.away_team} />
        </div>
      </div>
    </section>
  );
}

export function PredictionDistribution({
  predictions,
}: {
  predictions: PredictionWithProfile[];
}) {
  const rows = buildPredictionDistribution(predictions);

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Lo que ha puesto la gente</h2>
          <p className="mt-1 text-sm text-slate-300">
            Resultados agrupados por cantidad de jugadores.
          </p>
        </div>
        <Users className="h-7 w-7 text-[#ff2bd6]" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-black text-[#27e7ff]">{row.label}</span>
                <span className="badge">{row.count} personas</span>
              </div>
              <p className="mt-2 truncate text-sm text-slate-300">{row.names.join(", ")}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-black/25 p-4 text-sm text-slate-300">
            Todavia no hay resultados guardados para este partido.
          </div>
        )}
      </div>
    </section>
  );
}

export function formatMatchDate(value?: string | null) {
  if (!value) return "Fecha por definir";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "full",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function formatMatchTime(value?: string | null) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function formatPrediction(prediction?: MatchPrediction | null) {
  if (
    !prediction ||
    prediction.predicted_home_score === null ||
    prediction.predicted_away_score === null
  ) {
    return "-";
  }

  return `${prediction.predicted_home_score}-${prediction.predicted_away_score}`;
}

export function getMadridDateKey(value?: string | null) {
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

function buildPredictionDistribution(predictions: PredictionWithProfile[]) {
  const groups = predictions.reduce<
    Map<string, { label: string; count: number; names: string[] }>
  >((result, prediction) => {
    const label = formatPrediction(prediction);
    if (label === "-") return result;

    const current = result.get(label) ?? { label, count: 0, names: [] };
    current.count += 1;
    current.names.push(
      prediction.profiles?.display_name || prediction.profiles?.username || "Jugador",
    );
    result.set(label, current);
    return result;
  }, new Map());

  return Array.from(groups.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.label.localeCompare(right.label);
  });
}
