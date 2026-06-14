"use client";

import { useState } from "react";

interface Props {
  label: string;
  badge: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}

export function AdminCollapsibleDate({ label, badge, defaultOpen, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="grid gap-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="sticky top-0 z-10 w-full rounded-3xl border border-white/10 bg-slate-950/85 px-5 py-4 backdrop-blur text-left"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">{label}</h2>
          <div className="flex items-center gap-2">
            <span className="badge">{badge}</span>
            <span className="text-slate-400 text-sm">{open ? "▲" : "▼"}</span>
          </div>
        </div>
      </button>

      {open && children}
    </section>
  );
}
