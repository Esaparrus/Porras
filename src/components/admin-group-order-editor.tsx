"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Save } from "lucide-react";
import { saveGroupManualOrderAction } from "@/app/actions";
import { TeamBadge } from "@/components/ui";
import type { StandingRow } from "@/lib/types";

function moveRow(rows: StandingRow[], from: number, to: number) {
  const next = rows.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function AdminGroupOrderEditor({
  groupLetter,
  rows,
}: {
  groupLetter: string;
  rows: StandingRow[];
}) {
  const [orderedRows, setOrderedRows] = useState(rows);
  const teamIds = useMemo(
    () => orderedRows.map((row) => row.team.id).join(","),
    [orderedRows],
  );

  return (
    <form action={saveGroupManualOrderAction} className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <input type="hidden" name="group_letter" value={groupLetter} />
      <input type="hidden" name="team_ids" value={teamIds} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Grupo {groupLetter}</h3>
          <p className="mt-1 text-xs text-slate-300">
            Desempate real FIFA primero. Si hace falta, aquí puedes forzar el orden final.
          </p>
        </div>
        <button className="btn-secondary min-h-0 px-3 py-2 text-xs">
          <Save className="h-4 w-4" />
          Guardar
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {orderedRows.map((row, index) => (
          <div
            key={row.team.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff7a1a] text-sm font-black text-[#08111f]">
              {index + 1}
            </span>
            <div className="min-w-0">
              <TeamBadge team={row.team} />
              <div className="mt-1 text-[11px] font-bold text-slate-400">
                {row.points} pts · {row.goalDifference >= 0 ? "+" : ""}
                {row.goalDifference} DG · {row.goalsFor} GF
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
        ))}
      </div>
    </form>
  );
}

