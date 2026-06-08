"use client";

import { useState } from "react";
import { PlayerPicker } from "@/components/player-picker";
import type { Player, Team } from "@/lib/types";

type ScorerPickersProps = {
  players: Player[];
  teams: Team[];
  defaultValues: (string | null | undefined)[];
};

// Coordina los tres selectores de goleadores: un jugador elegido en una
// casilla deja de aparecer en las otras dos, para que no se pueda repetir.
export function ScorerPickers({
  players,
  teams,
  defaultValues,
}: ScorerPickersProps) {
  const [selected, setSelected] = useState<string[]>([
    defaultValues[0] ?? "",
    defaultValues[1] ?? "",
    defaultValues[2] ?? "",
  ]);

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((index) => {
        const excludeIds = selected.filter((id, i) => i !== index && Boolean(id));
        return (
          <label key={index}>
            <span className="label">Goleador {index + 1}</span>
            <PlayerPicker
              name={`player_${index + 1}`}
              players={players}
              teams={teams}
              defaultValue={defaultValues[index]}
              excludeIds={excludeIds}
              onSelectionChange={(playerId) =>
                setSelected((prev) => {
                  const next = [...prev];
                  next[index] = playerId;
                  return next;
                })
              }
            />
          </label>
        );
      })}
    </div>
  );
}
