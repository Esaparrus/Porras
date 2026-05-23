import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/data";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grass-shell min-h-screen text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function BrandLogo({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-3 font-black">
      <span className="grid h-11 w-20 place-items-center border-4 border-black bg-black p-1 shadow-[5px_5px_0_#000]">
        <Image
          src="/world-cup-logo.png"
          alt=""
          width={96}
          height={40}
          unoptimized
          className="h-full w-full object-contain"
        />
      </span>
      {label}
    </span>
  );
}

export function PublicHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-4">
      <Link href="/">
        <BrandLogo label="Porra Mundial 2026" />
      </Link>
      <div className="flex w-full gap-2 sm:w-auto">
        <Link href="/login" className="btn-secondary flex-1 py-2 sm:flex-none">
          Entrar
        </Link>
        <Link href="/register" className="btn-primary flex-1 py-2 sm:flex-none">
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
        <Link href="/dashboard">
          <BrandLogo label="Mi porra" />
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
              <Link
                href={`/league/${leagueId}/profile`}
                className="btn-secondary py-2"
              >
                Perfil
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

export async function AdminLayout({
  children,
  leagueId,
}: {
  children: React.ReactNode;
  leagueId?: string;
}) {
  async function getLeagueName() {
    if (!leagueId) return undefined;

    const { supabase } = await requireAdmin();
    const { data: league } = await supabase
      .from("leagues")
      .select("name")
      .eq("id", leagueId)
      .single();

    return league?.name;
  }

  return (
    <Shell>
      <header className="mb-6 flex flex-col gap-4">
        <Link href="/admin">
          <BrandLogo label="Panel admin" />
        </Link>
        <AdminNav leagueId={leagueId} leagueName={await getLeagueName()} />
      </header>
      {children}
    </Shell>
  );
}
