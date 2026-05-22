"use client";

import { useId, useState } from "react";
import type {
  Player,
  PlayerSelectionRequestStatus,
  Team,
} from "@/lib/types";
import { getDisplayPlayerName } from "@/lib/utils";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function statusCopy(status?: PlayerSelectionRequestStatus | null) {
  if (status === "approved") return "Validado por admin";
  if (status === "rejected") return "Pendiente de corregir";
  if (status === "pending") return "Pendiente de validar";
  return null;
}

type PlayerPickerProps = {
  name: string;
  players: Player[];
  teams: Team[];
  defaultValue?: string | null;
  allowManual?: boolean;
  manualDefaultName?: string | null;
  manualDefaultTeamId?: string | null;
  requestStatus?: PlayerSelectionRequestStatus | null;
};

export function PlayerPicker({
  name,
  players,
  teams,
  defaultValue,
  allowManual = false,
  manualDefaultName,
  manualDefaultTeamId,
  requestStatus,
}: PlayerPickerProps) {
  const pickerId = useId();
  const defaultPlayer = players.find((player) => player.id === defaultValue);
  const [mode, setMode] = useState<"select" | "manual">(
    manualDefaultName ? "manual" : "select",
  );
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(defaultPlayer?.name ?? manualDefaultName ?? "");
  const [teamFilter, setTeamFilter] = useState(
    manualDefaultTeamId ?? defaultPlayer?.team_id ?? "",
  );
  const [manualName, setManualName] = useState(manualDefaultName ?? "");

  const visiblePlayers = players
    .filter((player) => (teamFilter ? player.team_id === teamFilter : true))
    .filter((player) => {
      const search = normalizeText(query);
      if (!search) return true;
      const teamName = player.teams?.name ?? "";
      return normalizeText(
        `${player.name} ${getDisplayPlayerName(player)} ${teamName}`,
      ).includes(search);
    })
    .slice(0, 24);

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
      <input type="hidden" name={name} value={mode === "select" ? selectedId : ""} />
      <input type="hidden" name={`${name}_mode`} value={mode} />

      {allowManual ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={mode === "select" ? "btn-primary py-2" : "btn-secondary py-2"}
            onClick={() => setMode("select")}
          >
            Elegir de la lista
          </button>
          <button
            type="button"
            className={mode === "manual" ? "btn-primary py-2" : "btn-secondary py-2"}
            onClick={() => setMode("manual")}
          >
            Escribir manualmente
          </button>
          {statusCopy(requestStatus) ? (
            <span className="badge">{statusCopy(requestStatus)}</span>
          ) : null}
        </div>
      ) : null}

      {mode === "manual" ? (
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
          <input
            name={`${name}_manual_name`}
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
            placeholder="Nombre exacto del futbolista"
            className="field"
          />
          <select
            name={`${name}_manual_team_id`}
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="field"
          >
            <option value="">Selección / país</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.flag_emoji} {team.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-[1.35fr_1fr]">
            <input
              id={pickerId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por nombre o selección"
              className="field"
            />
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="field"
            >
              <option value="">Todas las selecciones</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.flag_emoji} {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-black/20">
            {visiblePlayers.length ? (
              visiblePlayers.map((player) => {
                const isActive = player.id === selectedId;
                return (
                  <button
                    key={player.id}
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                      isActive ? "bg-white/15" : "hover:bg-white/8"
                    }`}
                    onClick={() => {
                      setSelectedId(player.id);
                      setQuery(getDisplayPlayerName(player));
                      setTeamFilter(player.team_id);
                    }}
                  >
                    <span className="font-semibold">{getDisplayPlayerName(player)}</span>
                    <span className="text-xs text-slate-300">{player.teams?.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-slate-300">
                No hay coincidencias con esa búsqueda.
              </div>
            )}
          </div>

          <div className="text-sm text-slate-300">
            {selectedId
              ? `Seleccionado: ${getDisplayPlayerName(players.find((player) => player.id === selectedId)) || "Jugador"}`
              : "Todavía no has elegido jugador"}
          </div>
        </div>
      )}
    </div>
  );
}
