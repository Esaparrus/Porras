import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { League, Profile } from "@/lib/types";

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
