"use client";

import { useState } from "react";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

interface ScoreUser {
  displayName: string;
  avatarEmoji: string | null;
}

interface Props {
  homeScore: number;
  awayScore: number;
  homePill: React.ReactNode;
  users: ScoreUser[];
}

export function ExpandableScoreGroup({ homePill, users }: Props) {
  const [open, setOpen] = useState(false);
  const count = users.length;

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {homePill}
          <div className="min-w-0">
            <div className="text-sm font-black text-white">
              {count} persona{count === 1 ? "" : "s"}
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              han puesto este resultado
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Users className="h-5 w-5 text-[#27e7ff]" />
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 py-3">
          <ul className="flex flex-wrap gap-2">
            {users.map((user, index) => (
              <li
                key={index}
                className="flex items-center gap-1.5 rounded-xl bg-white/8 px-3 py-1.5 text-sm font-semibold text-slate-200"
              >
                {user.avatarEmoji && <span>{user.avatarEmoji}</span>}
                {user.displayName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
