'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Home, LogOut, Settings, Users } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

type AdminNavProps = {
  leagueId?: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const baseItems: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home, exact: true },
  { href: "/admin/results", label: "Resultados", icon: ClipboardList },
  { href: "/admin/leagues", label: "Ligas", icon: Users },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-w-[150px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-[#27e7ff]/70 bg-[#27e7ff]/18 text-white shadow-[4px_4px_0_#000]"
          : "border-white/10 bg-black/20 text-slate-200 hover:border-[#27e7ff]/40 hover:bg-white/10",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border",
          active
            ? "border-white/20 bg-black/25 text-[#27e7ff]"
            : "border-white/10 bg-white/5 text-slate-300",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Admin
        </span>
        <span className="block text-sm font-black uppercase">{item.label}</span>
      </span>
    </Link>
  );
}

export function AdminNav({ leagueId }: AdminNavProps) {
  const pathname = usePathname();
  const leagueItems: NavItem[] = leagueId
    ? [
        { href: `/admin/leagues/${leagueId}`, label: "Resumen liga", icon: BarChart3, exact: true },
        { href: `/admin/leagues/${leagueId}/ranking`, label: "Ranking", icon: Users },
        { href: `/admin/leagues/${leagueId}/settings`, label: "Ajustes", icon: Settings },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
          Navegación principal
        </div>
        <nav className="mt-3 flex flex-wrap gap-3">
          {baseItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>

      {leagueItems.length ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Liga actual
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Accesos rápidos de la liga que estás gestionando.
          </p>
          <nav className="mt-3 flex flex-wrap gap-3">
            {leagueItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>
      ) : null}

      <div className="flex justify-end">
        <form action={logoutAction}>
          <button className="btn-secondary py-2">
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}
