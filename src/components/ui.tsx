import Link from "next/link";
import {
  AlertTriangle,
  BadgeEuro,
  Crown,
  Loader2,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { formatCurrency, getPaymentStatusCopy } from "@/lib/league-insights";
import { POINT_SETTING_GROUPS, POINT_SETTING_LABELS } from "@/lib/point-settings";
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
          style={{ backgroundImage: `url(${flagUrl})` }}
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
    <nav className="flex gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const className = cn(
          "brutal-btn relative inline-flex min-h-0 items-center justify-center overflow-hidden whitespace-nowrap px-4 py-2 text-sm font-black uppercase leading-none transition before:absolute before:left-3 before:right-3 before:top-1 before:h-[3px] before:rounded-full",
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
  paymentStatus: LeaguePaymentStatus;
  prize: number;
  score: Score;
};

type RankingSummary = {
  memberCount: number;
  totalPot: number;
  entryPrice: number;
  playedPoints: number;
  remainingPoints: number;
  progressPercentage: number;
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
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide",
        status === "paid"
          ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-50"
          : "border-rose-300/35 bg-rose-500/15 text-rose-50",
      )}
    >
      <Icon className="h-4 w-4" />
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
  const podium = [rows[1], rows[0], rows[2]].filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[2rem] border-white/15">
        <div className="bg-gradient-to-r from-[#27e7ff] via-[#ff4d2d] to-[#ef4444] p-[1px]">
          <div className="bg-[#07111f]/96 px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#27e7ff]">
                  <Sparkles className="h-4 w-4" />
                  {title}
                </div>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                  La pelea por la gloria
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  {summary.playedPoints} puntos ya han salido al campo y quedan{" "}
                  {summary.remainingPoints} por decidir.
                </p>
              </div>
              <div className="min-w-[220px] rounded-[1.75rem] border border-white/10 bg-black/25 p-4">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                  Bote total
                </div>
                <div className="mt-2 text-3xl font-black text-[#27e7ff]">
                  {formatCurrency(summary.totalPot)}
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  {summary.memberCount} jugadores x {formatCurrency(summary.entryPrice)}
                </div>
              </div>
            </div>
            <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3bd16f] via-[#27e7ff] to-[#ff4d2d]"
                style={{ width: `${summary.progressPercentage}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-3 text-xs font-bold uppercase tracking-wide text-slate-300">
              <span>{summary.progressPercentage}% del botin de puntos ya se ha jugado</span>
              <span>{summary.remainingPoints} pts siguen en el aire</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Puntos jugados" value={summary.playedPoints} icon={<Trophy />} />
        <StatCard label="Puntos por jugar" value={summary.remainingPoints} icon={<Sparkles />} />
        <StatCard label="Premio 1º" value={formatCurrency(summary.prizes.first)} icon={<Crown />} />
        <StatCard label="Premio 2º-3º" value={`${formatCurrency(summary.prizes.second)} / ${formatCurrency(summary.prizes.third)}`} icon={<BadgeEuro />} />
      </div>

      {podium.length ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {podium.map((row) => {
            const position = rows.findIndex((item) => item.userId === row.userId) + 1;
            const accent =
              position === 1
                ? "from-[#27e7ff] to-[#ff4d2d]"
                : position === 2
                  ? "from-slate-100 to-slate-400"
                  : "from-amber-500 to-orange-700";

            return (
              <article
                key={row.userId}
                className="glass relative overflow-hidden rounded-[2rem] border-white/15 p-5"
              >
                <div className={cn("absolute inset-x-0 top-0 h-2 bg-gradient-to-r", accent)} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                      {position === 1 ? "Lider" : `Puesto ${position}`}
                    </div>
                    <h3 className="mt-2 text-2xl font-black text-white">{row.displayName}</h3>
                  </div>
                  <div className="rounded-2xl bg-black/30 px-4 py-3 text-right">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-300">
                      Premio
                    </div>
                    <div className="text-2xl font-black text-[#27e7ff]">
                      {formatCurrency(row.prize)}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-5xl font-black leading-none text-white">
                      {row.score.total_points}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-300">
                      puntos totales
                    </div>
                  </div>
                  <PaymentStatusChip status={row.paymentStatus} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-slate-300">Exactos</div>
                    <div className="mt-1 text-2xl font-black">{row.score.exact_scores_count}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-slate-300">Eliminatorias</div>
                    <div className="mt-1 text-2xl font-black">{row.score.knockout_points}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f]/80">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.08] text-xs uppercase tracking-[0.2em] text-slate-300">
            <tr>
              <th className="px-4 py-4">#</th>
              <th className="px-4 py-4">Jugador</th>
              <th className="px-4 py-4">Total</th>
              <th className="px-4 py-4">Premio</th>
              <th className="px-4 py-4">Pago</th>
              <th className="px-4 py-4">Pts partidos</th>
              <th className="px-4 py-4">Pts grupos</th>
              <th className="px-4 py-4">Pts KO</th>
              <th className="px-4 py-4">Pts goles</th>
              <th className="px-4 py-4">Pts premios</th>
              <th className="px-4 py-4">Exactos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const playerHref = `/league/${leagueId}/players/${row.userId}`;
              const playerName = allowPlayerLinks ? (
                <Link href={playerHref} className="hover:text-[#27e7ff]">
                  {row.displayName}
                </Link>
              ) : (
                row.displayName
              );

              return (
                <tr key={row.userId} className="border-t border-white/10 align-top">
                  <td className="px-4 py-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 font-black text-[#27e7ff]">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <div className="font-black text-white">{playerName}</div>
                      <PaymentStatusChip status={row.paymentStatus} compact />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-3xl font-black text-white">{row.score.total_points}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      puntos
                    </div>
                  </td>
                  <td className="px-4 py-4 font-black text-[#27e7ff]">
                    {row.prize ? formatCurrency(row.prize) : "-"}
                  </td>
                  <td className="px-4 py-4">
                    <PaymentStatusChip status={row.paymentStatus} />
                  </td>
                  <td className="px-4 py-4">{row.score.match_points}</td>
                  <td className="px-4 py-4">{row.score.group_points}</td>
                  <td className="px-4 py-4">{row.score.knockout_points}</td>
                  <td className="px-4 py-4">{row.score.scorer_points}</td>
                  <td className="px-4 py-4">{row.score.award_points}</td>
                  <td className="px-4 py-4">{row.score.exact_scores_count}</td>
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
        <span className="badge">En directo</span>
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

