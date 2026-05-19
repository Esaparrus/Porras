import Link from "next/link";
import { redirect } from "next/navigation";
import { UserLayout } from "@/components/layouts";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/data";

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireUser();
  if (profile.role === "admin") redirect("/admin");

  const { data: memberships } = await supabase
    .from("league_members")
    .select("leagues(*)")
    .eq("user_id", user.id);

  type JoinedLeague = { id: string; name: string; code: string };
  const membershipRows = (memberships ?? []) as unknown as Array<{
    leagues: JoinedLeague | JoinedLeague[] | null;
  }>;
  const leagues = membershipRows
    .map((item) => (Array.isArray(item.leagues) ? item.leagues[0] : item.leagues))
    .filter((league): league is JoinedLeague => Boolean(league));
  if (leagues.length === 1) redirect(`/league/${leagues[0].id}`);

  return (
    <UserLayout>
      <h1 className="text-3xl font-black">Tus ligas</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {leagues.length ? (
          leagues.map((league) => (
            <Link
              key={league.id}
              href={`/league/${league.id}`}
              className="glass rounded-2xl p-5 transition hover:bg-white/12"
            >
              <div className="text-2xl font-black">{league.name}</div>
              <div className="mt-2 text-sm text-slate-300">{league.code}</div>
            </Link>
          ))
        ) : (
          <EmptyState
            title="Aún no estás en ninguna liga"
            text="Regístrate de nuevo con un código o pide al admin que te añada."
          />
        )}
      </div>
    </UserLayout>
  );
}
