import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  Loader2,
  Minus,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { formatCurrency, getPaymentStatusCopy } from "@/lib/league-insights";
import { POINT_SETTING_GROUPS, POINT_SETTING_LABELS, POINT_SETTING_NOTES, computePointsBreakdown } from "@/lib/point-settings";
import type { RankingMovement } from "@/lib/ranking-history";
import type {
  LeaguePaymentStatus,
  Match,
  Player,
  PointSettings,
  Score,
  StandingRow,
  Team,
} from "@/lib/types";
import { cn, getDisplayPlayerName, getTeamFlagImageUrl } from "@/lib/utils";

export function TeamBadge({ team }: { team?: Team | null }) {
  if (!team) return <span className="text-slate-400">Por definir</span>;
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2 font-semibold leading-tight text-white">
      <TeamFlag team={team} />
      <span className="min-w-0 max-w-full break-words">{team.name}</span>
    </span>
  );
}

export function TeamFlag({
  team,
  className,
}: {
  team?: Pick<Team, "flag_code" | "flag_emoji" | "short_name"> | null;
  className?: string;
}) {
  if (!team) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-[2px] bg-white/10 text-[9px] text-slate-400",
          className,
        )}
      >
        ?
      </span>
    );
  }

  const flagUrl = getTeamFlagImageUrl(team);

  if (flagUrl) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "h-4 w-6 shrink-0 rounded-[2px] bg-cover bg-center shadow-sm shadow-black/30",
          className,
        )}
        style={{ backgroundImage: `url("${flagUrl}")` }}
      />
    );
  }

  return <span className="shrink-0">{team.flag_emoji}</span>;
}

export function MatchTeamLabel({
  team,
  placeholder,
}: {
  team?: Team | null;
  placeholder?: string | null;
}) {
  if (team) return <TeamBadge team={team} />;
  return <span className="min-w-0 max-w-full break-words font-semibold leading-tight text-slate-300">{placeholder ?? "Por definir"}</span>;
}

function MatchMeta({ match }: { match: Match }) {
  const date = match.match_date
    ? new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Madrid",
      }).format(new Date(match.match_date))
    : null;

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-400">
      {match.match_number ? <span>Partido {match.match_number}</span> : null}
      {date ? <span>{date}</span> : null}
      {match.venue ? <span>{match.venue}</span> : null}
    </div>
  );
}

export function PlayerBadge({ player }: { player?: Player | null }) {
  if (!player) return <span className="text-slate-400">Sin jugador</span>;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
      <TeamFlag team={player.teams} />
      <span>{getDisplayPlayerName(player)}</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-slate-300">
        <span className="text-sm font-semibold">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function PositionOrdinal({ value }: { value: number }) {
  return (
    <>
      {value}
      <span className="align-super text-[0.72em] leading-none">º</span>
    </>
  );
}

export function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-[#ff2bd6]" />
      <h3 className="mt-4 text-xl font-black">{title}</h3>
      <p className="mt-2 text-slate-300">{text}</p>
    </div>
  );
}

export function LoadingSpinner() {
  return <Loader2 className="h-5 w-5 animate-spin" />;
}

export function SaveStatusBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
      {message}
    </div>
  );
}

export function LeagueCodeBox({ code }: { code: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
        Código para WhatsApp
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <code className="rounded-xl bg-black/30 px-4 py-3 text-2xl font-black text-[#ff7a1a]">
          {code}
        </code>
        <CopyButton value={code} className="btn-secondary" />
      </div>
    </div>
  );
}

export function StageTabs({
  items,
  active,
}: {
  items: Array<{ href: string; label: string }>;
  active?: string;
}) {
  return (
    <nav className="stage-tabs">
      {items.map((item) => {
        const className = cn(
          "stage-tab brutal-btn",
          active === item.label
            ? "bg-[#ff2bd6] text-white shadow-[4px_4px_0_#000] before:bg-white/80 hover:bg-[#ff64df] hover:shadow-[6px_6px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px]"
            : "bg-[rgb(17_43_19_/_0.78)] text-white shadow-[4px_4px_0_#000] before:bg-[#27e7ff] hover:bg-[#27e7ff] hover:text-black hover:shadow-[6px_6px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px]",
        );

        if (item.href.startsWith("#")) {
          return (
            <a key={item.href} href={item.href} className={className}>
              {item.label}
            </a>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MatchCard({ match }: { match: Match }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-right">
          <MatchTeamLabel team={match.home_team} placeholder={match.home_placeholder} />
        </div>
        <div className="rounded-xl bg-black/30 px-3 py-2 font-black text-white">
          {match.home_score ?? "-"} - {match.away_score ?? "-"}
        </div>
        <MatchTeamLabel team={match.away_team} placeholder={match.away_placeholder} />
      </div>
      <MatchMeta match={match} />
    </div>
  );
}

export function PredictionInput({ match }: { match: Match }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="grid grid-cols-[1fr_70px_18px_70px_1fr] items-center gap-2">
        <div className="text-right text-sm">
          <MatchTeamLabel team={match.home_team} placeholder={match.home_placeholder} />
        </div>
        <input
          name={`home_${match.id}`}
          type="number"
          min="0"
          className="field text-center"
        />
        <span className="text-center font-black">-</span>
        <input
          name={`away_${match.id}`}
          type="number"
          min="0"
          className="field text-center"
        />
        <div className="text-sm">
          <MatchTeamLabel team={match.away_team} placeholder={match.away_placeholder} />
        </div>
      </div>
      <MatchMeta match={match} />
      {match.stage !== "group" && match.home_team_id && match.away_team_id ? (
        <select name={`winner_${match.id}`} className="field mt-3">
          <option value="">Clasificado</option>
          <option value={match.home_team_id}>{match.home_team?.name}</option>
          <option value={match.away_team_id}>{match.away_team?.name}</option>
        </select>
      ) : null}
    </div>
  );
}

type RankingEntry = {
  userId: string;
  displayName: string;
  username?: string | null;
  avatarEmoji?: string | null;
  paymentStatus: LeaguePaymentStatus;
  prize: number;
  movement?: RankingMovement | null;
  score: Score;
};

type RankingSummary = {
  memberCount: number;
  totalPot: number;
  entryPrice: number;
  playedPoints: number;
  remainingPoints: number;
  progressPercentage: number;
  finishedMatches: number;
  totalMatches: number;
  matchProgressPercentage: number;
  groupStageMatches: number;
  knockoutStageMatches: number;
  prizes: {
    first: number;
    second: number;
    third: number;
    remainder: number;
  };
};

export function PaymentStatusChip({
  status,
  compact = false,
}: {
  status: LeaguePaymentStatus;
  compact?: boolean;
}) {
  const copy = getPaymentStatusCopy(status);
  const Icon = status === "paid" ? ShieldCheck : ShieldX;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-black uppercase tracking-wide",
        compact ? "gap-0.5 px-1 py-0.5 text-[8px] sm:gap-1.5 sm:px-2 sm:py-1 sm:text-[11px]" : "gap-2 px-3 py-2 text-xs",
        status === "paid"
          ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-50"
          : "border-rose-300/35 bg-rose-500/15 text-rose-50",
      )}
    >
      <Icon className={compact ? "hidden sm:block sm:h-3.5 sm:w-3.5" : "h-4 w-4"} />
      {compact ? copy.short : copy.playful}
    </span>
  );
}

export function RankingTable({
  leagueId,
  rows,
  summary,
  title,
  allowPlayerLinks = false,
}: {
  leagueId: string;
  rows: RankingEntry[];
  summary: RankingSummary;
  title: string;
  allowPlayerLinks?: boolean;
}) {
  const groupBoundaryPercentage = summary.totalMatches
    ? (summary.groupStageMatches / summary.totalMatches) * 100
    : 0;
  const groupFillPercentage = Math.min(summary.matchProgressPercentage, groupBoundaryPercentage);
  const knockoutFillPercentage =
    summary.matchProgressPercentage > groupBoundaryPercentage
      ? summary.matchProgressPercentage - groupBoundaryPercentage
      : 0;
  const isKnockoutPhaseVisible =
    summary.knockoutStageMatches > 0 && summary.finishedMatches >= summary.groupStageMatches;

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[2rem] border-white/15">
        <div className="bg-gradient-to-r from-[#27e7ff] via-[#ff4d2d] to-[#ef4444] p-[1px]">
          <div className="bg-[#07111f]/96 px-5 py-6 sm:px-7">
            <div className="space-y-5">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#27e7ff]">
                  <Sparkles className="h-4 w-4" />
                  {title}
                </div>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                  La pelea por la gloria
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  {summary.finishedMatches} de {summary.totalMatches} partidos ya estan cerrados.
                  {summary.totalMatches > 0 ? ` Quedan ${summary.totalMatches - summary.finishedMatches} por decidir.` : ""}
                </p>
              </div>
              <div className="grid gap-4">
                <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/8 p-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    <span>Progreso partidos</span>
                    <span>{summary.matchProgressPercentage}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    <span>Grupos</span>
                    <span className={cn(isKnockoutPhaseVisible && "text-amber-300")}>KO</span>
                  </div>
                  <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500/10"
                      style={{ width: `${groupBoundaryPercentage}%` }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 bg-amber-500/10"
                      style={{ width: `${Math.max(0, 100 - groupBoundaryPercentage)}%` }}
                    />
                    {summary.knockoutStageMatches > 0 ? (
                      <div
                        className="absolute inset-y-[-2px] z-10 w-[2px] rounded-full bg-white/70"
                        style={{ left: `${groupBoundaryPercentage}%` }}
                      />
                    ) : null}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#16a34a] via-[#4ade80] to-[#bbf7d0]"
                      style={{ width: `${groupFillPercentage}%` }}
                    />
                    {knockoutFillPercentage > 0 ? (
                      <div
                        className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#f59e0b] via-[#fb923c] to-[#f97316]"
                        style={{
                          left: `${groupBoundaryPercentage}%`,
                          width: `${knockoutFillPercentage}%`,
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-300">
                    {summary.finishedMatches}/{summary.totalMatches} partidos cerrados
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-cyan-400/15 bg-cyan-500/8 p-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    <span>Progreso puntos</span>
                    <span>{summary.progressPercentage}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#06b6d4] via-[#27e7ff] to-[#60a5fa]"
                      style={{ width: `${summary.progressPercentage}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-300">
                    {summary.playedPoints} pts resueltos, {summary.remainingPoints} pts en juego
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f]/80">
        <table className="w-full min-w-0 table-fixed text-left text-xs sm:min-w-[720px] sm:text-sm">
          <colgroup>
            <col className="w-[28%] sm:w-[18%]" />
            <col className="w-[32%] sm:w-[38%]" />
            <col className="w-[17%] sm:w-[20%]" />
            <col className="w-[23%] sm:w-[24%]" />
          </colgroup>
          <thead className="bg-white/[0.08] text-[9px] uppercase tracking-[0.08em] text-slate-300 sm:text-xs sm:tracking-[0.2em]">
            <tr>
              <th className="px-0.5 py-3 text-left sm:px-4 sm:py-4" aria-label="Posicion" />
              <th className="px-0 py-3 pl-3 sm:px-4 sm:py-4">Jugador</th>
              <th className="px-0 py-3 text-center sm:px-4 sm:py-4 sm:text-left">Total</th>
              <th className="px-0 py-3 text-center sm:px-4 sm:py-4 sm:text-left">Premio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isPodium = index < 3;
              const podiumRowClass =
                index === 0
                  ? "bg-[linear-gradient(90deg,rgba(255,215,0,0.3),rgba(255,215,0,0.12),rgba(255,255,255,0.03))]"
                  : index === 1
                    ? "bg-[linear-gradient(90deg,rgba(203,213,225,0.28),rgba(203,213,225,0.11),rgba(255,255,255,0.03))]"
                    : index === 2
                      ? "bg-[linear-gradient(90deg,rgba(205,127,50,0.32),rgba(205,127,50,0.13),rgba(255,255,255,0.03))]"
                      : "";
              const podiumBadgeClass =
                index === 0
                  ? "bg-[#f6c344] text-[#1f1600]"
                  : index === 1
                    ? "bg-[#cbd5e1] text-[#111827]"
                    : index === 2
                      ? "bg-[#cd7f32] text-[#1f1307]"
                      : "bg-white/10 text-[#27e7ff]";
              const podiumPrizeClass =
                index === 0
                  ? "text-[#f6c344]"
                  : index === 1
                    ? "text-[#dbe4f0]"
                    : index === 2
                      ? "text-[#d69659]"
                      : "text-[#27e7ff]";
              const playerHref = `/league/${leagueId}/players/${row.userId}`;
              const playerLabel = (
                <span className="inline-flex min-w-0 items-center gap-1 sm:gap-2">
                  {row.avatarEmoji ? (
                    <span className="text-sm leading-none sm:text-xl" aria-hidden="true">
                      {row.avatarEmoji}
                    </span>
                  ) : null}
                  <span className="truncate">{row.displayName}</span>
                </span>
              );
              const playerName = allowPlayerLinks ? (
                <Link href={playerHref} className="inline-flex min-w-0 hover:text-[#27e7ff]">
                  {playerLabel}
                </Link>
              ) : playerLabel;
              const gapReference =
                index === 0
                  ? null
                  : index === 1
                    ? { label: <>vs <PositionOrdinal value={1} /></>, score: rows[0]?.score.total_points }
                    : index === 2
                      ? { label: <>vs <PositionOrdinal value={2} /></>, score: rows[1]?.score.total_points }
                      : { label: "podio", score: rows[2]?.score.total_points };
              const pointsGap =
                gapReference?.score === undefined
                  ? null
                  : Math.max(0, gapReference.score - row.score.total_points);

              return (
                <tr
                  key={row.userId}
                  className={cn("border-t border-white/10 align-top", podiumRowClass)}
                >
                  <td className="px-0.5 py-3 pl-2 sm:px-4 sm:py-4">
                    <div className="flex items-center justify-start gap-1.5 sm:gap-2">
                      <div
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black sm:h-10 sm:w-10 sm:rounded-2xl sm:text-base",
                          podiumBadgeClass,
                        )}
                      >
                        {index + 1}
                      </div>
                      <RankingMovementChip movement={row.movement ?? null} compact />
                    </div>
                  </td>
                  <td className="px-0 py-3 pl-3 sm:px-4 sm:py-4">
                    <div className="space-y-1 sm:space-y-2">
                      <div
                        className={cn(
                          "text-[14px] font-black text-white sm:text-base",
                          isPodium && "tracking-[0.02em]",
                        )}
                      >
                        {playerName}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] font-black uppercase tracking-wide sm:text-xs",
                          row.paymentStatus === "paid" ? "text-emerald-300" : "text-rose-300",
                        )}
                      >
                        {row.paymentStatus === "paid" ? "Pagado" : "Moroso"}
                      </div>
                      {allowPlayerLinks ? (
                        <Link
                          href={playerHref}
                          className="inline-flex items-center gap-1 rounded-full border border-[#27e7ff]/40 bg-[#27e7ff]/10 px-2 py-1 text-[10px] font-black uppercase text-[#27e7ff] hover:bg-[#27e7ff] hover:text-black sm:gap-2 sm:px-3 sm:text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver apuestas
                        </Link>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-0 py-3 text-center sm:px-4 sm:py-4 sm:text-left">
                    <div className="text-[19px] font-black text-white sm:text-3xl">
                      {row.score.total_points}
                    </div>
                    {gapReference && pointsGap !== null ? (
                      <div className="mt-0.5 text-[8px] font-black uppercase leading-none tracking-tight text-slate-300/90 sm:text-[10px] sm:tracking-wide">
                        {pointsGap === 0 ? "=" : `-${pointsGap}`} {gapReference.label}
                      </div>
                    ) : null}
                    <div className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:block sm:text-xs">
                      puntos
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-0 py-3 text-center text-[13px] font-black sm:px-4 sm:py-4 sm:text-left sm:text-base",
                      podiumPrizeClass,
                    )}
                  >
                    {row.prize ? formatCurrency(row.prize) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GroupStandingTable({
  rows,
  showBestThirdBadge,
}: {
  rows: StandingRow[];
  showBestThirdBadge?: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-slate-400">
        <tr>
          <th className="py-2 text-left">Equipo</th>
          <th>Pts</th>
          <th>GF</th>
          <th>GC</th>
          <th>DG</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.team.id} className="border-t border-white/10">
            <td className="py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff2bd6] px-2 text-[11px] font-black text-[#08111f]">
                  {index + 1}
                </span>
                <TeamBadge team={row.team} />
                {showBestThirdBadge && index === 2 && (
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                    PD
                  </span>
                )}
              </div>
            </td>
            <td className="text-center">{row.points}</td>
            <td className="text-center">{row.goalsFor}</td>
            <td className="text-center">{row.goalsAgainst}</td>
            <td className="text-center">{row.goalDifference}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RankingMovementChip({
  movement,
  compact = false,
}: {
  movement?: RankingMovement | null;
  compact?: boolean;
}) {
  if (!movement) return null;

  if (movement.direction === "same") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-white/10 font-black text-slate-300",
          compact ? "px-1.5 py-1 text-[10px] sm:px-2 sm:text-[11px]" : "px-2 py-1 text-xs",
        )}
      >
        <Minus className="h-3 w-3" />
        =
      </span>
    );
  }

  if (movement.direction === "up") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 font-black text-emerald-300",
          compact ? "px-1.5 py-1 text-[10px] sm:px-2 sm:text-[11px]" : "px-2 py-1 text-xs",
        )}
      >
        <ArrowUp className="h-3 w-3" />
        {movement.delta}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-rose-500/15 font-black text-rose-300",
        compact ? "px-1.5 py-1 text-[10px] sm:px-2 sm:text-[11px]" : "px-2 py-1 text-xs",
      )}
    >
      <ArrowDown className="h-3 w-3" />
      {movement.delta}
    </span>
  );
}

export function ScoreBreakdownCard({ score }: { score?: Score | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07111f]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Trophy className="h-5 w-5 text-[#ff2bd6]" />
        <h3 className="font-black">Desglose</h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <span>Pts partidos</span>
        <strong className="text-right">{score?.match_points ?? 0}</strong>
        <span>Pts grupos</span>
        <strong className="text-right">{score?.group_points ?? 0}</strong>
        <span>Pts eliminatorias</span>
        <strong className="text-right">{score?.knockout_points ?? 0}</strong>
        <span>Pts goleadores</span>
        <strong className="text-right">{score?.scorer_points ?? 0}</strong>
        <span>Pts premios</span>
        <strong className="text-right">{score?.award_points ?? 0}</strong>
      </div>
    </div>
  );
}

export function PointsPhilosophyCard({ settings }: { settings: PointSettings }) {
  const b = computePointsBreakdown(settings);
  const sign = settings.match_sign_points;
  const gd = settings.match_goal_difference_points;
  const exact = settings.match_exact_score_points;

  // Ejemplo trabajado: resultado real 2-1, qué saca cada pronóstico.
  const matchExamples = [
    {
      label: "2-1",
      caption: "marcador exacto",
      parts: [
        { tag: "Signo", pts: sign, bar: "bg-sky-400" },
        { tag: "Diferencia", pts: gd, bar: "bg-emerald-400" },
        { tag: "Exacto", pts: exact, bar: "bg-fuchsia-400" },
      ],
    },
    {
      label: "3-2",
      caption: "signo + diferencia",
      parts: [
        { tag: "Signo", pts: sign, bar: "bg-sky-400" },
        { tag: "Diferencia", pts: gd, bar: "bg-emerald-400" },
      ],
    },
    {
      label: "1-0",
      caption: "solo el ganador",
      parts: [{ tag: "Signo", pts: sign, bar: "bg-sky-400" }],
    },
    { label: "0-1", caption: "fallo", parts: [] as { tag: string; pts: number; bar: string }[] },
  ];

  // Escalada del premio por avanzar de ronda.
  const reachedSteps = [
    { label: "Octavos", value: settings.knockout_round_16_reached_points },
    { label: "Cuartos", value: settings.knockout_quarter_reached_points },
    { label: "Semis", value: settings.knockout_semi_reached_points },
    { label: "Final", value: settings.knockout_final_reached_points },
  ];
  const reachedMax = Math.max(...reachedSteps.map((s) => s.value), 1);

  const phases = [
    { title: "Fase de grupos", value: b.group, pct: b.groupPct, bar: "bg-sky-400" },
    { title: "Eliminatorias", value: b.knockout, pct: b.knockoutPct, bar: "bg-emerald-400" },
    { title: "Premios y goleadores", value: b.awards, pct: b.awardsPct, bar: "bg-amber-400" },
  ];

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Por qué estos puntos</h2>
          <p className="mt-1 text-sm text-slate-300">
            El reparto está pensado para que la porra siga viva hasta el último partido.
          </p>
        </div>
        <span className="badge">Explicación</span>
      </div>

      {/* Principio 1 · clavar el resultado */}
      <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-base font-black">1 · Clavar el resultado vale más que la diferencia</h3>
        <p className="mt-1 text-sm text-slate-300">
          En un partido los aciertos se suman: el ganador (1/X/2) da{" "}
          <strong className="text-white">{sign}</strong>, la diferencia de goles{" "}
          <strong className="text-white">+{gd}</strong> y clavar el marcador{" "}
          <strong className="text-white">+{exact}</strong>. Clavar el resultado pesa más porque es lo más
          difícil.
        </p>
        <div className="mt-3 rounded-xl bg-black/30 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Ejemplo · resultado real 2-1
          </p>
          <div className="mt-2 space-y-2">
            {matchExamples.map((ex) => {
              const total = ex.parts.reduce((sum, p) => sum + p.pts, 0);
              return (
                <div key={ex.label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-sm">
                    <span className="font-black text-white">{ex.label}</span>{" "}
                    <span className="text-xs text-slate-400">{ex.caption}</span>
                  </div>
                  <div className="flex h-4 flex-1 items-center gap-1">
                    {ex.parts.length === 0 ? (
                      <div className="h-2 w-full rounded-full bg-white/5" />
                    ) : (
                      ex.parts.map((p) => (
                        <div
                          key={p.tag}
                          title={`${p.tag}: ${p.pts}`}
                          className={`h-2 rounded-full ${p.bar}`}
                          style={{ flexGrow: p.pts, minWidth: 8 }}
                        />
                      ))
                    )}
                  </div>
                  <span className="w-12 shrink-0 text-right font-black text-white">{total} pts</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Signo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Diferencia
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Exacto
            </span>
          </div>
        </div>
      </section>

      {/* Principio 2 · escalada del avance */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-base font-black">2 · Cuanto más avanza el torneo, más puntos hay en juego</h3>
        <p className="mt-1 text-sm text-slate-300">
          Acertar que un equipo avanza vale más en cada ronda. Seguir a un equipo desde octavos hasta la
          final son <strong className="text-white">{b.finalistRun} pts</strong> solo por avanzar.
        </p>
        <div className="mt-3 space-y-2">
          {reachedSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-slate-300">{step.label}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${(step.value / reachedMax) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-black text-white">{step.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-300">
          El avance se premia una sola vez (no hay bonus extra por ganar el partido, para no puntuar lo
          mismo dos veces). Clasificar de la fase de grupos ya se premia aparte, así que llegar a
          dieciseisavos no suma de nuevo.
        </p>
      </section>

      {/* Principio 3 · marcador de eliminatoria con ambas selecciones */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-base font-black">
          3 · En eliminatorias, el marcador solo cuenta si aciertas el cruce
        </h3>
        <p className="mt-1 text-sm text-slate-300">
          Como cada cruce depende de tu cuadro, el marcador (signo, diferencia y resultado exacto) de un
          partido de eliminatoria{" "}
          <strong className="text-white">solo puntúa si acertaste las dos selecciones</strong> que lo
          juegan, aunque el número coincida. Acertar quién avanza se premia siempre aparte (ver punto 2).
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-100">
              <ShieldCheck className="h-4 w-4" /> El marcador cuenta
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Predijiste <strong className="text-white">España–Francia 2-1</strong> y el cruce real es{" "}
              <strong className="text-white">España–Francia</strong>. Sumas signo/diferencia/exacto.
            </p>
          </div>
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3">
            <div className="flex items-center gap-2 text-sm font-black text-rose-100">
              <ShieldX className="h-4 w-4" /> El marcador no cuenta
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Predijiste <strong className="text-white">España–Alemania 2-1</strong> pero juega{" "}
              <strong className="text-white">España–Francia</strong>. El 2-1 no suma (el avance de España,
              sí).
            </p>
          </div>
        </div>
      </section>

      {/* Principio 4 · reparto por fase */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-base font-black">4 · Se puede remontar hasta el final</h3>
        <p className="mt-1 text-sm text-slate-300">
          Así se reparten los <strong className="text-white">{b.total} puntos</strong> que hay en juego como
          máximo:
        </p>
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-white/10">
          {phases.map((p) => (
            <div key={p.title} className={`h-full ${p.bar}`} style={{ width: `${p.pct}%` }} />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {phases.map((p) => (
            <div key={p.title} className="flex items-center gap-3 text-sm">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.bar}`} />
              <span className="flex-1 text-slate-300">{p.title}</span>
              <span className="font-black text-white">
                {p.value} pts · {p.pct}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-300">
          Casi la mitad de los puntos (<strong className="text-white">{b.knockoutPct}%</strong>) se reparte
          de las eliminatorias en adelante, y ahí están los mayores golpes: acertar al campeón{" "}
          ({settings.knockout_champion_points} pts) equivale a clavar el marcador exacto de{" "}
          <strong className="text-white">{b.championInGroupMatches}</strong> partidos de grupo. Por mucho que
          aciertes en la fase de grupos, quien lea bien el cuadro puede darte la vuelta.
        </p>
      </section>

      <p className="mt-4 text-xs leading-snug text-slate-400">
        Cálculos sobre el máximo teórico con el formato de 48 selecciones (12 grupos, 72 partidos de grupos
        y 32 de eliminatoria). Si la liga cambia algún valor, estos números se recalculan solos.
      </p>
    </div>
  );
}

export function PointRulesCard({ settings }: { settings: PointSettings }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Cómo se puntúa</h2>
          <p className="mt-1 text-sm text-slate-300">
            Estos valores salen de la configuración actual de la liga.
          </p>
        </div>
        <span className="badge">Configuración</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {POINT_SETTING_GROUPS.map(([groupTitle, keys]) => (
          <section key={groupTitle} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-lg font-black">{groupTitle}</h3>
            <div className="mt-3 grid gap-2 text-sm">
              {keys.map((key) => (
                <div
                  key={key}
                  className="rounded-2xl bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-300">{POINT_SETTING_LABELS[key]}</span>
                    <strong className="text-base text-white">{settings[key]} pts</strong>
                  </div>
                  {POINT_SETTING_NOTES[key] && (
                    <p className="mt-1 text-xs leading-snug text-slate-400">
                      {POINT_SETTING_NOTES[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function PlayerSearchCombobox({
  name,
  players,
  defaultValue,
}: {
  name: string;
  players: Player[];
  defaultValue?: string | null;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="field">
      <option value="">Buscar jugador...</option>
      {players.map((player) => (
        <option key={player.id} value={player.id}>
          {player.name} · {player.teams?.name}
        </option>
      ))}
    </select>
  );
}

export function ScorerQuickCounter({
  leagueId,
  playerId,
  name,
  team,
  pickedCount,
  goals,
  action,
}: {
  leagueId: string;
  playerId: string;
  name: string;
  team?: Pick<Team, "flag_code" | "flag_emoji" | "short_name"> | null;
  pickedCount: number;
  goals: number;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
      <div>
        <div className="flex items-center gap-2 font-black">
          <TeamFlag team={team} />
          <span>{name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Users className="h-4 w-4" />
          Elegido por {pickedCount} usuarios
        </div>
      </div>
      <div className="flex items-center gap-2">
        <form action={action}>
          <input type="hidden" name="league_id" value={leagueId} />
          <input type="hidden" name="player_id" value={playerId} />
          <input type="hidden" name="delta" value="-1" />
          <button className="btn-secondary px-4 py-2">-</button>
        </form>
        <span className="min-w-10 rounded-xl bg-black/30 px-3 py-2 text-center font-black">
          {goals}
        </span>
        <form action={action}>
          <input type="hidden" name="league_id" value={leagueId} />
          <input type="hidden" name="player_id" value={playerId} />
          <input type="hidden" name="delta" value="1" />
          <button className="btn-primary px-4 py-2">+</button>
        </form>
      </div>
    </div>
  );
}

export function ConfirmDialog({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

