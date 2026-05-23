'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

type AdminNavProps = {
  leagueId?: string;
  leagueName?: string;
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

function MainNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      className={cn(
        "inline-flex min-h-12 items-center gap-2 border-4 border-black px-4 py-2 text-sm font-black uppercase text-black shadow-[5px_5px_0_#000] transition",
        active
          ? "bg-[#ff2bd6] text-white"
          : "bg-[#27e7ff] hover:bg-[#7cf3ff]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function LeagueNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 border px-3 py-2 text-sm font-black uppercase transition",
        active
          ? "border-[#27e7ff] bg-[#27e7ff] text-black shadow-[4px_4px_0_#000]"
          : "border-white/15 bg-black/25 text-slate-100 hover:border-[#27e7ff]/70 hover:bg-white/10",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AdminNav({ leagueId, leagueName }: AdminNavProps) {
  const pathname = usePathname();
  const currentLeagueName = leagueName ?? "esta liga";
  const leagueItems: NavItem[] = leagueId
    ? [
        { href: `/admin/leagues/${leagueId}`, label: "Resumen", icon: BarChart3, exact: true },
        { href: `/admin/leagues/${leagueId}/users`, label: "Usuarios", icon: Users },
        { href: `/admin/leagues/${leagueId}/settings`, label: "Puntuacion", icon: Settings },
        { href: `/admin/leagues/${leagueId}/ranking`, label: "Ranking", icon: Trophy },
        { href: `/admin/leagues/${leagueId}/logs`, label: "Logs", icon: ClipboardList },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="border border-white/10 bg-black/20 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
              Navegacion principal
            </div>
            <p className="mt-1 text-sm text-slate-300">
              Accesos generales del panel de administrador.
            </p>
          </div>
          {leagueId ? (
            <div className="inline-flex items-center gap-2 bg-black/35 px-3 py-2 text-xs font-black uppercase text-slate-200">
              <span>Admin</span>
              <ChevronRight className="h-4 w-4 text-[#27e7ff]" />
              <span>Ligas</span>
              <ChevronRight className="h-4 w-4 text-[#27e7ff]" />
              <span className="text-white">{currentLeagueName}</span>
            </div>
          ) : null}
        </div>
        <nav className="mt-3 flex flex-wrap gap-3">
          {baseItems.map((item) => (
            <MainNavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>

      {leagueItems.length ? (
        <div className="border-4 border-black bg-[#315523]/90 p-4 shadow-[7px_7px_0_#000]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#27e7ff]">
                Dentro de la liga
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">{currentLeagueName}</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-100">
                Estas opciones afectan solo a esta liga: usuarios, puntuacion, ranking y actividad.
              </p>
            </div>
            <Link href="/admin/leagues" className="btn-secondary py-2">
              Ver todas las ligas
            </Link>
          </div>
          <nav className="mt-4 flex flex-wrap gap-3">
            {leagueItems.map((item) => (
              <LeagueNavLink key={item.href} item={item} pathname={pathname} />
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
