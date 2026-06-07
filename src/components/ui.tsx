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
import { POINT_SETTING_GROUPS, POINT_SETTING_LABELS } from "@/lib/point-settings";
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
  const flagUrl = getTeamFlagImageUrl(team);
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2 font-semibold text-white">
      {flagUrl ? (
        <span
          aria-hidden="true"
          className="h-4 w-6 shrink-0 rounded-[2px] bg-cover bg-center shadow-sm shadow-black/30"
          style={{ backgroundImage: `url("${flagUrl}")` }}
        />
      ) : (
        <span className="shrink-0">{team.flag_emoji}</span>
      )}
      <span className="truncate">{team.name}</span>
    </span>
  );
}

export function MatchTeamLabel({
  team,
  placeholder,
}: {
  team?: Team | null;
  placeholder?: string | null;
}) {
  if (team) return <TeamBadge team={team} />;
  return <span className="min-w-0 truncate font-semibold text-slate-300">{placeholder ?? "Por definir"}</span>;
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
      <span>{player.teams?.flag_emoji}</span>
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
                    ? { label: "vs 1o", score: rows[0]?.score.total_points }
                    : index === 2
                      ? { label: "vs 2o", score: rows[1]?.score.total_points }
                      : { label: "podio", score: rows[2]?.score.total_points };
              const pointsGap =
                gapReference?.score === undefined
                  ? null
                  : Math.max(0, gapReference.score - row.score.total_points);
              const pointsGapLabel =
                gapReference && pointsGap !== null
                  ? `${pointsGap === 0 ? "=" : `-${pointsGap}`} ${gapReference.label}`
                  : null;

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
                    {pointsGapLabel ? (
                      <div className="mt-0.5 text-[8px] font-black uppercase leading-none tracking-tight text-slate-300/90 sm:text-[10px] sm:tracking-wide">
                        {pointsGapLabel}
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

export function GroupStandingTable({ rows }: { rows: StandingRow[] }) {
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
    <div className="glass rounded-2xl p-5">
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

export function PointRulesCard({ settings }: { settings: PointSettings }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Como se puntua</h2>
          <p className="mt-1 text-sm text-slate-300">
            Estos valores salen de la configuración actual de la liga.
          </p>
        </div>
        <span className="badge">Configuracion</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {POINT_SETTING_GROUPS.map(([groupTitle, keys]) => (
          <section key={groupTitle} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-lg font-black">{groupTitle}</h3>
            <div className="mt-3 grid gap-2 text-sm">
              {keys.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2"
                >
                  <span className="text-slate-300">{POINT_SETTING_LABELS[key]}</span>
                  <strong className="text-base text-white">{settings[key]} pts</strong>
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
          {player.teams?.flag_emoji} {player.name} · {player.teams?.name}
        </option>
      ))}
    </select>
  );
}

export function ScorerQuickCounter({
  leagueId,
  playerId,
  name,
  flag,
  pickedCount,
  goals,
  action,
}: {
  leagueId: string;
  playerId: string;
  name: string;
  flag?: string;
  pickedCount: number;
  goals: number;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
      <div>
        <div className="font-black">
          {name} {flag}
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

