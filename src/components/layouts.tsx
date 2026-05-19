import Link from "next/link";
import { LogOut, Shield, Trophy } from "lucide-react";
import { logoutAction } from "@/app/actions";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#153a66_0,#06111f_36%,#030712_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

export function PublicHeader() {
  return (
    <header className="flex items-center justify-between gap-4 py-4">
      <Link href="/" className="flex items-center gap-3 font-black">
        <span className="rounded-2xl bg-[#d6b25e] p-2 text-[#08111f]">
          <Trophy className="h-5 w-5" />
        </span>
        Porra Mundial 2026
      </Link>
      <div className="flex gap-2">
        <Link href="/login" className="btn-secondary py-2">
          Entrar
        </Link>
        <Link href="/register" className="btn-primary py-2">
          Registrarse
        </Link>
      </div>
    </header>
  );
}

export function UserLayout({
  children,
  leagueId,
}: {
  children: React.ReactNode;
  leagueId?: string;
}) {
  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-3 font-black">
          <Trophy className="h-6 w-6 text-[#d6b25e]" />
          Mi porra
        </Link>
        <nav className="flex flex-wrap gap-2">
          {leagueId ? (
            <>
              <Link href={`/league/${leagueId}`} className="btn-secondary py-2">
                Liga
              </Link>
              <Link
                href={`/league/${leagueId}/predictions`}
                className="btn-secondary py-2"
              >
                Apuestas
              </Link>
              <Link
                href={`/league/${leagueId}/ranking`}
                className="btn-secondary py-2"
              >
                Ranking
              </Link>
            </>
          ) : null}
          <form action={logoutAction}>
            <button className="btn-secondary py-2">
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </form>
        </nav>
      </header>
      {children}
    </Shell>
  );
}

export function AdminLayout({
  children,
  leagueId,
}: {
  children: React.ReactNode;
  leagueId?: string;
}) {
  const base = leagueId ? `/admin/leagues/${leagueId}` : "/admin";
  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="flex items-center gap-3 font-black">
          <Shield className="h-6 w-6 text-[#d6b25e]" />
          Panel admin
        </Link>
        <nav className="flex flex-wrap gap-2">
          <Link href="/admin/leagues" className="btn-secondary py-2">
            Ligas
          </Link>
          {leagueId ? (
            <>
              <Link href={base} className="btn-secondary py-2">
                Resumen
              </Link>
              <Link href={`${base}/daily`} className="btn-secondary py-2">
                Diario
              </Link>
              <Link href={`${base}/ranking`} className="btn-secondary py-2">
                Ranking
              </Link>
              <Link href={`${base}/settings`} className="btn-secondary py-2">
                Ajustes
              </Link>
            </>
          ) : null}
          <form action={logoutAction}>
            <button className="btn-secondary py-2">
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </form>
        </nav>
      </header>
      {children}
    </Shell>
  );
}
