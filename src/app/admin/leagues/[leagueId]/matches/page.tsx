import Link from "next/link";
import { updateMatchResultAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";
import { GroupStandingTable, MatchTeamLabel, StageTabs } from "@/components/ui";
import { STAGE_LABELS } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { calculateRealGroupStandings } from "@/lib/scoring";
import type { Match, Team } from "@/lib/types";
import { getCurrentAdminStage, KNOCKOUT_STAGES } from "@/lib/world-cup";

const GROUPS = "ABCDEFGHIJKL".split("");

export default async function AdminMatchesPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: matchData }, { data: teamData }] = await Promise.all([
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_number", { ascending: true, nullsFirst: false }),
    supabase.from("teams").select("*").order("group_letter").order("manual_order"),
  ]);

  const matches = (matchData ?? []) as Match[];
  const teams = (teamData ?? []) as Team[];
  const currentStage = getCurrentAdminStage(matches);
  const groupMatches = matches.filter((match) => match.stage === "group");
  const groupProgress = groupMatches.filter((match) => match.is_finished).length;
  const currentMatches =
    currentStage === "group" || currentStage === "awards"
      ? []
      : matches.filter((match) => match.stage === currentStage);

  return (
    <AdminLayout leagueId={leagueId}>
      <StageTabs
        items={[
          { href: "#grupos", label: "Grupos" },
          { href: "#cruces", label: "Cruces" },
          { href: "#actual", label: "Ronda actual" },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Resultados del Mundial</h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            Fase actual: {currentStage === "awards" ? "Premios finales" : currentStage === "group" ? "Grupos" : STAGE_LABELS[currentStage]}
          </p>
        </div>
        <span className="badge">{groupProgress}/72 grupos guardados</span>
      </div>

      {currentStage === "group" ? (
        <section id="grupos" className="mt-6 grid gap-5">
          {GROUPS.map((group) => (
            <div key={group} className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
              <div className="glass rounded-2xl p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Grupo {group}</h2>
                  <span className="badge">
                    {groupMatches.filter((match) => match.group_letter === group && match.is_finished).length}/6
                  </span>
                </div>
                <div className="grid gap-3">
                  {groupMatches
                    .filter((match) => match.group_letter === group)
                    .map((match) => (
                      <MatchResultForm key={match.id} leagueId={leagueId} match={match} />
                    ))}
                </div>
              </div>
              <div className="glass rounded-2xl p-4">
                <h3 className="mb-3 font-black">Tabla en vivo</h3>
                <GroupStandingTable rows={calculateRealGroupStandings(teams, matches, group)} />
              </div>
            </div>
          ))}
        </section>
      ) : (
        <>
          <section id="cruces" className="mt-6">
            <h2 className="text-2xl font-black">Cuadro generado</h2>
            <WorldCupBracket matches={matches} />
          </section>

          <section id="actual" className="mt-8">
            {currentStage === "awards" ? (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-black">Torneo completado</h2>
                <p className="mt-2 text-slate-300">
                  Ya puedes introducir pichichi, mejor jugador, mejor portero y mejor joven.
                </p>
                <Link href={`/admin/leagues/${leagueId}/awards`} className="btn-primary mt-5">
                  Ir a premios finales
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black">{STAGE_LABELS[currentStage]}</h2>
                <div className="mt-4 grid gap-3">
                  {currentMatches.map((match) => (
                    <MatchResultForm key={match.id} leagueId={leagueId} match={match} />
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}

function MatchResultForm({ leagueId, match }: { leagueId: string; match: Match }) {
  const needsWinner = match.stage !== "group" && match.home_team_id && match.away_team_id;

  return (
    <form action={updateMatchResultAction} className="rounded-xl border border-white/10 bg-black/20 p-3">
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="match_id" value={match.id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold">
            <MatchTeamLabel team={match.home_team} placeholder={match.home_placeholder} /> vs{" "}
            <MatchTeamLabel team={match.away_team} placeholder={match.away_placeholder} />
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-400">
            Partido {match.match_number} · {match.venue ?? "Sede por definir"}
          </div>
        </div>
        <span className={match.is_finished ? "badge border-emerald-300/30 text-emerald-100" : "badge"}>
          {match.is_finished ? "Guardado" : "Pendiente"}
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[80px_80px_1fr_auto]">
        <input name="home_score" type="number" min="0" defaultValue={match.home_score ?? ""} className="field text-center" />
        <input name="away_score" type="number" min="0" defaultValue={match.away_score ?? ""} className="field text-center" />
        {needsWinner ? (
          <select name="winner_team_id" defaultValue={match.winner_team_id ?? ""} className="field">
            <option value="">Clasificado si hay empate</option>
            <option value={match.home_team_id ?? ""}>{match.home_team?.name}</option>
            <option value={match.away_team_id ?? ""}>{match.away_team?.name}</option>
          </select>
        ) : (
          <input type="hidden" name="winner_team_id" value="" />
        )}
        <label className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 text-sm font-bold">
          <input type="checkbox" name="is_finished" defaultChecked={match.is_finished} />
          Fin
        </label>
      </div>
      <button className="btn-primary mt-3 w-full py-2">Guardar</button>
    </form>
  );
}

function WorldCupBracket({ matches }: { matches: Match[] }) {
  const byStage = new Map(
    KNOCKOUT_STAGES.map((stage) => [
      stage,
      matches
        .filter((match) => match.stage === stage)
        .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0)),
    ]),
  );
  const round32 = byStage.get("round_32") ?? [];
  const round16 = byStage.get("round_16") ?? [];
  const quarters = byStage.get("quarter_final") ?? [];
  const semis = byStage.get("semi_final") ?? [];
  const final = byStage.get("final")?.[0] ?? null;

  return (
    <div className="bracket-shell mt-4">
      <div className="bracket-grid">
        <BracketSide
          side="left"
          columns={[
            { label: STAGE_LABELS.round_32, matches: round32.slice(0, 8) },
            { label: STAGE_LABELS.round_16, matches: round16.slice(0, 4) },
            { label: STAGE_LABELS.quarter_final, matches: quarters.slice(0, 2) },
            { label: STAGE_LABELS.semi_final, matches: semis.slice(0, 1) },
          ]}
        />

        <div className="bracket-final">
          <div className="bracket-trophy">FINAL</div>
          {final ? <BracketNode match={final} compact /> : null}
        </div>

        <BracketSide
          side="right"
          columns={[
            { label: STAGE_LABELS.semi_final, matches: semis.slice(1, 2) },
            { label: STAGE_LABELS.quarter_final, matches: quarters.slice(2, 4) },
            { label: STAGE_LABELS.round_16, matches: round16.slice(4, 8) },
            { label: STAGE_LABELS.round_32, matches: round32.slice(8, 16) },
          ]}
        />
      </div>
    </div>
  );
}

function BracketSide({
  side,
  columns,
}: {
  side: "left" | "right";
  columns: Array<{ label: string; matches: Match[] }>;
}) {
  return (
    <div className={`bracket-side bracket-side-${side}`}>
      {columns.map((column, index) => (
        <div
          key={`${side}-${column.label}-${index}`}
          className={`bracket-column bracket-gap-${column.matches.length}`}
        >
          <div className="bracket-label">{column.label}</div>
          <div className="bracket-stack">
            {column.matches.map((match) => (
              <BracketNode key={match.id} match={match} side={side} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketNode({
  match,
  side,
  compact,
}: {
  match: Match;
  side?: "left" | "right";
  compact?: boolean;
}) {
  return (
    <div className={`bracket-node ${side ? `bracket-node-${side}` : ""} ${compact ? "bracket-node-final" : ""}`}>
      <div className="bracket-match-number">P{match.match_number}</div>
      <BracketTeamLine team={match.home_team} placeholder={match.home_placeholder} score={match.home_score} />
      <BracketTeamLine team={match.away_team} placeholder={match.away_placeholder} score={match.away_score} />
    </div>
  );
}

function BracketTeamLine({
  team,
  placeholder,
  score,
}: {
  team?: Team | null;
  placeholder?: string | null;
  score: number | null;
}) {
  return (
    <div className="bracket-team-line">
      <MatchTeamLabel team={team} placeholder={placeholder} />
      <strong>{score ?? "-"}</strong>
    </div>
  );
}
