"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Save } from "lucide-react";
import { saveAdminBestThirdOrderAction } from "@/app/actions";
import { TeamBadge } from "@/components/ui";
import type { StandingRow } from "@/lib/types";

function moveRow(rows: StandingRow[], from: number, to: number) {
  const next = rows.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function AdminBestThirdOrderEditor({
  rows,
  qualifyingSlots,
}: {
  rows: StandingRow[];
  qualifyingSlots: number;
}) {
  const [orderedRows, setOrderedRows] = useState(rows);
  const teamIds = useMemo(
    () => orderedRows.map((row) => row.team.id).join(","),
    [orderedRows],
  );

  return (
    <form
      action={saveAdminBestThirdOrderAction}
      className="rounded-3xl border border-[#ff7a1a]/40 bg-black/20 p-4"
    >
      <input type="hidden" name="team_ids" value={teamIds} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Empate de mejores terceros</h3>
          <p className="mt-1 text-xs text-slate-300">
            Estos terceros empatan a puntos, diferencia y goles a favor. Pasan los{" "}
            <strong>
              {qualifyingSlots === 1
                ? "1.º de la lista"
                : `${qualifyingSlots} primeros`}
            </strong>
            ; ordénalos para decidir quién clasifica.
          </p>
        </div>
        <button className="btn-secondary min-h-0 px-3 py-2 text-xs">
          <Save className="h-4 w-4" />
          Guardar
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {orderedRows.map((row, index) => {
          const qualifies = index < qualifyingSlots;
          return (
            <div
              key={row.team.id}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border px-3 py-2 ${
                qualifies
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                  qualifies
                    ? "bg-emerald-400 text-[#08111f]"
                    : "bg-white/15 text-white"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <TeamBadge team={row.team} />
                <div className="mt-1 text-[11px] font-bold text-slate-400">
                  Grupo {row.team.group_letter} · {row.points} pts ·{" "}
                  {row.goalDifference >= 0 ? "+" : ""}
                  {row.goalDifference} DG · {row.goalsFor} GF
                  {qualifies ? "" : " · eliminado"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    setOrderedRows((current) => moveRow(current, index, index - 1))
                  }
                  className="rounded-xl border border-white/10 bg-white/10 p-2 text-white disabled:opacity-35"
                  aria-label={`Subir ${row.team.name}`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === orderedRows.length - 1}
                  onClick={() =>
                    setOrderedRows((current) => moveRow(current, index, index + 1))
                  }
                  className="rounded-xl border border-white/10 bg-white/10 p-2 text-white disabled:opacity-35"
                  aria-label={`Bajar ${row.team.name}`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
}
