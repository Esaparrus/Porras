import { notFound } from "next/navigation";
import { UserLayout } from "@/components/layouts";
import { PlayerBetsView } from "@/components/player-bets-view";
import { getPlayerBetsViewData } from "@/lib/player-bets-data";
import { requireUser } from "@/lib/data";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string; userId: string }>;
}) {
  const { leagueId, userId } = await params;
  const { supabase } = await requireUser();
  const data = await getPlayerBetsViewData(supabase, leagueId, userId);
  if (!data) notFound();

  return (
    <UserLayout leagueId={leagueId}>
      <PlayerBetsView {...data} />
    </UserLayout>
  );
}
