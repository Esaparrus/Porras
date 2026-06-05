import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { League, Player, Profile } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const SUPABASE_PAGE_SIZE = 1000;

export async function getSessionProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { supabase, user, profile };
}

export async function requireUser() {
  const context = await getSessionProfile();
  if (!context.user || !context.profile) redirect("/login");
  return context as typeof context & { user: NonNullable<typeof context.user>; profile: Profile };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.profile.role !== "admin") redirect("/dashboard");
  return context;
}

export async function getLeagueOrRedirect(leagueId: string) {
  const { supabase } = await requireUser();
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single<League>();
  if (!league) redirect("/dashboard");
  return league;
}

export async function getActivePlayers(supabase: SupabaseServerClient) {
  const players: Player[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("players")
      .select("*, teams(*)")
      .eq("is_active", true)
      .order("scorer_rank", { ascending: true, nullsFirst: false })
      .order("name")
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) throw error;

    const rows = (data ?? []) as Player[];
    players.push(...rows);

    if (rows.length < SUPABASE_PAGE_SIZE) return players;
  }
}
