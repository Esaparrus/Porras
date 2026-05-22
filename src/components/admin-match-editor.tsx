"use client";

import { useState } from "react";
import { clearAdminMatchBundleAction, saveAdminMatchBundleAction } from "@/app/actions";
import { MatchTeamLabel } from "@/components/ui";
import type { Match, Player } from "@/lib/types";

type LeaderboardEntry = {
  playerId: string;
  name: string;
  flag: string;
  teamName: string;
  goals: number;
};

type AdminMatchEditorProps = {
  match: Match;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeScorerIds: string[];
  awayScorerIds: string[];
  leaderboard: LeaderboardEntry[];
  stageLabel: string;
  scheduleLabel: string | null;
};

function createGoalSlots(count: number, defaults: string[]) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => defaults[index] ?? "");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function InlineScorerPicker({
  side,
  index,
  players,
  value,
  onChange,
}: {
  side: "home" | "away";
  index: number;
  players: Player[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(
    players.find((player) => player.id === value)?.name ?? "",
  );
  const filteredPlayers = players
    .filter((player) =>
      normalizeText(`${player.name} ${player.teams?.name ?? ""}`).includes(
        normalizeText(query),
      ),
    )
    .slice(0, 12);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        Gol {index + 1}
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar goleador"
        className="field"
      />
      <input type="hidden" name={`${side}_scorer_player_id`} value={value} />
      <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-white/10 bg-black/20">
        {filteredPlayers.map((player) => (
          <button
            key={player.id}
            type="button"
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${
              value === player.id ? "bg-white/15" : "hover:bg-white/8"
            }`}
            onClick={() => {
              onChange(player.id);
              setQuery(player.name);
            }}
          >
            <span className="font-semibold">
              {player.teams?.flag_emoji} {player.name}
            </span>
            <span className="text-xs text-slate-300">{player.teams?.name}</span>
          </button>
        ))}
        {!filteredPlayers.length ? (
          <div className="px-3 py-3 text-sm text-slate-300">Sin coincidencias.</div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminMatchEditor({
  match,
  homePlayers,
  awayPlayers,
  homeScorerIds,
  awayScorerIds,
  leaderboard,
  stageLabel,
  scheduleLabel,
}: AdminMatchEditorProps) {
  const [homeScore, setHomeScore] = useState(String(match.home_score ?? ""));
  const [awayScore, setAwayScore] = useState(String(match.away_score ?? ""));
  const [homeSelections, setHomeSelections] = useState(
    createGoalSlots(match.home_score ?? 0, homeScorerIds),
  );
  const [awaySelections, setAwaySelections] = useState(
    createGoalSlots(match.away_score ?? 0, awayScorerIds),
  );

  const homeGoalCount = Math.max(0, Number(homeScore) || 0);
  const awayGoalCount = Math.max(0, Number(awayScore) || 0);
  const previewTotals = new Map(leaderboard.map((entry) => [entry.playerId, entry.goals]));

  homeScorerIds.forEach((playerId) => {
    previewTotals.set(playerId, Math.max(0, (previewTotals.get(playerId) ?? 0) - 1));
  });
  awayScorerIds.forEach((playerId) => {
    previewTotals.set(playerId, Math.max(0, (previewTotals.get(playerId) ?? 0) - 1));
  });
  [...homeSelections, ...awaySelections].forEach((playerId) => {
    if (!playerId) return;
    previewTotals.set(playerId, (previewTotals.get(playerId) ?? 0) + 1);
  });

  const liveLeaders = leaderboard
    .map((entry) => ({ ...entry, goals: previewTotals.get(entry.playerId) ?? 0 }))
    .filter((entry) => entry.goals > 0)
    .sort((left, right) => right.goals - left.goals || left.name.localeCompare(right.name))
    .slice(0, 10);

  return (
    <form action={saveAdminMatchBundleAction} className="glass rounded-3xl p-5">
      <input type="hidden" name="match_id" value={match.id} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-black">
            <MatchTeamLabel team={match.home_team} placeholder={match.home_placeholder} /> vs{" "}
            <MatchTeamLabel team={match.away_team} placeholder={match.away_placeholder} />
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {match.match_number ? `Partido ${match.match_number}` : "Partido"}
            {` · ${stageLabel}`}
            {scheduleLabel ? ` · ${scheduleLabel}` : ""}
            {match.venue ? ` · ${match.venue}` : ""}
          </div>
        </div>
        <span className={match.is_finished ? "badge border-emerald-300/30 text-emerald-100" : "badge"}>
          {match.is_finished ? "Guardado" : "Pendiente"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-[90px_90px_1fr_auto]">
            <input
              name="home_score"
              type="number"
              min="0"
              value={homeScore}
              onChange={(event) => {
                const nextValue = event.target.value;
                setHomeScore(nextValue);
                setHomeSelections((current) =>
                  createGoalSlots(Math.max(0, Number(nextValue) || 0), current),
                );
              }}
              className="field text-center"
            />
            <input
              name="away_score"
              type="number"
              min="0"
              value={awayScore}
              onChange={(event) => {
                const nextValue = event.target.value;
                setAwayScore(nextValue);
                setAwaySelections((current) =>
                  createGoalSlots(Math.max(0, Number(nextValue) || 0), current),
                );
              }}
              className="field text-center"
            />
            {match.stage !== "group" && match.home_team_id && match.away_team_id ? (
              <select name="winner_team_id" defaultValue={match.winner_team_id ?? ""} className="field">
                <option value="">Clasificado en caso de empate</option>
                <option value={match.home_team_id}>{match.home_team?.name}</option>
                <option value={match.away_team_id}>{match.away_team?.name}</option>
              </select>
            ) : (
              <input type="hidden" name="winner_team_id" value="" />
            )}
            <label className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 text-sm font-bold">
              <input type="checkbox" name="is_finished" defaultChecked={match.is_finished} />
              Fin
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 font-black">
                Goles de {match.home_team?.name ?? match.home_placeholder ?? "Local"}
              </h3>
              <div className="grid gap-3">
                {Array.from({ length: homeGoalCount }, (_, index) => (
                  <InlineScorerPicker
                    key={`home-${match.id}-${index}`}
                    side="home"
                    index={index}
                    players={homePlayers}
                    value={homeSelections[index] ?? ""}
                    onChange={(value) =>
                      setHomeSelections((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? value : item)),
                      )
                    }
                  />
                ))}
                {!homeGoalCount ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-300">
                    Pon el marcador para desplegar los goleadores.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-black">
                Goles de {match.away_team?.name ?? match.away_placeholder ?? "Visitante"}
              </h3>
              <div className="grid gap-3">
                {Array.from({ length: awayGoalCount }, (_, index) => (
                  <InlineScorerPicker
                    key={`away-${match.id}-${index}`}
                    side="away"
                    index={index}
                    players={awayPlayers}
                    value={awaySelections[index] ?? ""}
                    onChange={(value) =>
                      setAwaySelections((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? value : item)),
                      )
                    }
                  />
                ))}
                {!awayGoalCount ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-300">
                    Pon el marcador para desplegar los goleadores.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-lg font-black">Tabla viva de goleadores</h3>
          <p className="mt-2 text-xs text-slate-300">
            Aquí solo salen jugadores que alguien haya elegido en sus apuestas.
          </p>
          <div className="mt-3 grid gap-2">
            {liveLeaders.length ? (
              liveLeaders.map((entry) => (
                <div
                  key={`${match.id}-${entry.playerId}`}
                  className="flex items-center justify-between rounded-2xl bg-white/8 px-3 py-2"
                >
                  <div>
                    <div className="font-semibold">
                      {entry.flag} {entry.name}
                    </div>
                    <div className="text-xs text-slate-300">{entry.teamName}</div>
                  </div>
                  <strong className="text-xl">{entry.goals}</strong>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-300">Todavía no hay goleadores cargados.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn-primary">Guardar resultado y goleadores</button>
        <button type="submit" formAction={clearAdminMatchBundleAction} className="btn-secondary">
          Quitar resultado
        </button>
      </div>
    </form>
  );
}


