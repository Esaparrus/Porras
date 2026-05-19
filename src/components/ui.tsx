import Link from "next/link";
import { Trophy, Users, Loader2, AlertTriangle } from "lucide-react";
import type { Match, Player, Score, StandingRow, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TeamBadge({ team }: { team?: Team | null }) {
  if (!team) return <span className="text-slate-400">Por definir</span>;
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-white">
      <span>{team.flag_emoji}</span>
      <span>{team.name}</span>
    </span>
  );
}

export function PlayerBadge({ player }: { player?: Player | null }) {
  if (!player) return <span className="text-slate-400">Sin jugador</span>;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
      <span>{player.teams?.flag_emoji}</span>
      <span>{player.name}</span>
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
      <AlertTriangle className="mx-auto h-8 w-8 text-[#d6b25e]" />
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
        <code className="rounded-xl bg-black/30 px-4 py-3 text-2xl font-black text-[#f2d37d]">
          {code}
        </code>
        <button type="button" className="btn-secondary" data-copy={code}>
          Copiar
        </button>
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
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition",
            active === item.label
              ? "bg-[#d6b25e] text-[#08111f]"
              : "bg-white/10 text-slate-200 hover:bg-white/15",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MatchCard({ match }: { match: Match }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-right">
          <TeamBadge team={match.home_team} />
        </div>
        <div className="rounded-xl bg-black/30 px-3 py-2 font-black text-white">
          {match.home_score ?? "-"} - {match.away_score ?? "-"}
        </div>
        <TeamBadge team={match.away_team} />
      </div>
    </div>
  );
}

export function PredictionInput({ match }: { match: Match }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="grid grid-cols-[1fr_70px_18px_70px_1fr] items-center gap-2">
        <div className="text-right text-sm">
          <TeamBadge team={match.home_team} />
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
          <TeamBadge team={match.away_team} />
        </div>
      </div>
      {match.stage !== "group" ? (
        <select name={`winner_${match.id}`} className="field mt-3">
          <option value="">Clasificado</option>
          <option value={match.home_team_id}>{match.home_team?.name}</option>
          <option value={match.away_team_id}>{match.away_team?.name}</option>
        </select>
      ) : null}
    </div>
  );
}

export function RankingTable({ scores }: { scores: Score[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-300">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Apodo</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Partidos</th>
            <th className="px-4 py-3">Grupos</th>
            <th className="px-4 py-3">Eliminatorias</th>
            <th className="px-4 py-3">Goleadores</th>
            <th className="px-4 py-3">Premios</th>
            <th className="px-4 py-3">Exactos</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, index) => (
            <tr key={score.id} className="border-t border-white/10">
              <td className="px-4 py-3 font-black text-[#d6b25e]">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-bold">
                {score.profiles?.display_name ?? "Jugador"}
              </td>
              <td className="px-4 py-3 font-black text-white">
                {score.total_points}
              </td>
              <td className="px-4 py-3">{score.match_points}</td>
              <td className="px-4 py-3">{score.group_points}</td>
              <td className="px-4 py-3">{score.knockout_points}</td>
              <td className="px-4 py-3">{score.scorer_points}</td>
              <td className="px-4 py-3">{score.award_points}</td>
              <td className="px-4 py-3">{score.exact_scores_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GroupStandingTable({ rows }: { rows: StandingRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-slate-400">
        <tr>
          <th className="py-2 text-left">#</th>
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
            <td className="py-2 font-black text-[#d6b25e]">{index + 1}</td>
            <td className="py-2">
              <TeamBadge team={row.team} />
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
        <Trophy className="h-5 w-5 text-[#d6b25e]" />
        <h3 className="font-black">Desglose</h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <span>Partidos</span>
        <strong className="text-right">{score?.match_points ?? 0}</strong>
        <span>Grupos</span>
        <strong className="text-right">{score?.group_points ?? 0}</strong>
        <span>Eliminatorias</span>
        <strong className="text-right">{score?.knockout_points ?? 0}</strong>
        <span>Goleadores</span>
        <strong className="text-right">{score?.scorer_points ?? 0}</strong>
        <span>Premios</span>
        <strong className="text-right">{score?.award_points ?? 0}</strong>
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
