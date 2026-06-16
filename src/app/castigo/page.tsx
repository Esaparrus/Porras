import { CastigoExperience } from "@/components/castigo-experience";
import { requireUser } from "@/lib/data";

// El castigo se muestra con el nombre del usuario que ha entrado. Si tiene un
// castigo activo en alguna liga -> modo "real" (al terminar entra a esa liga).
// Si no, modo "preview" para que el creador pueda probarlo cuando quiera.
export default async function CastigoPage() {
  const { supabase, user, profile } = await requireUser();

  const { data: pending } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("user_id", user.id)
    .eq("castigo_pending", true)
    .limit(1)
    .maybeSingle();

  const userName = profile.display_name || profile.username || "Jugador";

  return (
    <CastigoExperience
      userName={userName}
      mode={pending ? "real" : "preview"}
      leagueId={pending?.league_id ?? null}
    />
  );
}
