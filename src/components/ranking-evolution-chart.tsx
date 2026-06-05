"use client";

import Link from "next/link";
import { ArrowLeft, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  RankingEvolutionData,
  RankingEvolutionEntry,
} from "@/lib/ranking-evolution";

const FRAME_MS = 900;
const ROW_HEIGHT = 58;
const TOP_OFFSET = 18;

export function RankingEvolutionChart({
  leagueId,
  data,
}: {
  leagueId: string;
  data: RankingEvolutionData;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(data.frames.length > 1);
  const frame = data.frames[frameIndex] ?? data.frames[0];
  const playerByUserId = useMemo(
    () => new Map(data.players.map((player) => [player.userId, player])),
    [data.players],
  );
  const maxPoints = Math.max(
    1,
    ...data.frames.flatMap((item) => item.entries.map((entry) => entry.totalPoints)),
  );
  const progress =
    data.frames.length > 1 ? Math.round((frameIndex / (data.frames.length - 1)) * 100) : 0;
  const chartHeight = Math.max(360, data.players.length * ROW_HEIGHT + TOP_OFFSET * 2);

  useEffect(() => {
    if (!playing || data.frames.length <= 1) return;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= data.frames.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, FRAME_MS);

    return () => window.clearInterval(timer);
  }, [data.frames.length, playing]);

  if (!frame) {
    return (
      <main className="min-h-screen bg-[#06111f] p-6 text-white">
        <Link href={`/league/${leagueId}/ranking`} className="btn-secondary">
          <ArrowLeft className="h-5 w-5" />
          Volver
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.08] p-6">
          Todavia no hay datos para pintar la evolucion.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="flex min-h-screen min-w-[980px] flex-col bg-[radial-gradient(circle_at_20%_15%,rgba(39,231,255,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.28))] p-4 lg:p-6">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/league/${leagueId}/ranking`}
              className="inline-flex h-12 w-12 items-center justify-center border-4 border-black bg-[#27e7ff] text-black shadow-[5px_5px_0_#000] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#000]"
              aria-label="Volver al ranking"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#27e7ff]">
                Evolucion del ranking
              </p>
              <h1 className="text-2xl font-black leading-none sm:text-4xl">
                Carrera de la liga
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center border-4 border-black bg-[#ff2bd6] text-white shadow-[5px_5px_0_#000] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#000]"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "Pausar evolucion" : "Reproducir evolucion"}
            >
              {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center border-4 border-black bg-white text-black shadow-[5px_5px_0_#000] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#000]"
              onClick={() => {
                setFrameIndex(0);
                setPlaying(data.frames.length > 1);
              }}
              aria-label="Reiniciar evolucion"
            >
              <RotateCcw className="h-6 w-6" />
            </button>
          </div>
        </header>

        <section className="mt-4 grid shrink-0 grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <div className="text-5xl font-black leading-none text-[#ff7a1a]">
              {frame.label}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-slate-300">
              <span>{frame.finishedMatches} de {data.totalMatches} partidos cerrados</span>
              {frame.matchNumber ? <span>Partido {frame.matchNumber}</span> : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
              Avance
            </div>
            <div className="mt-1 text-4xl font-black text-[#27e7ff]">{progress}%</div>
          </div>
        </section>

        <div className="mt-4 h-3 shrink-0 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3bd16f] via-[#27e7ff] to-[#ff2bd6] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="mt-4 grid min-h-0 flex-1 grid-cols-[1fr_280px] gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/28">
            <div className="absolute left-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-200">
              Y: posicion / X: fecha
            </div>
            <div className="absolute inset-0 overflow-auto p-4 pt-14">
              <div className="relative min-h-full" style={{ height: chartHeight }}>
                <RankAxis count={data.players.length} />
                <PathChart
                  frames={data.frames}
                  frameIndex={frameIndex}
                  chartHeight={chartHeight}
                  playerIds={data.players.map((player) => player.userId)}
                  playerByUserId={playerByUserId}
                />
                <div className="absolute inset-x-0 bottom-0 left-[54px] right-4 h-px bg-white/15" />
                {frame.entries.map((entry) => (
                  <RaceBar
                    key={entry.userId}
                    entry={entry}
                    player={playerByUserId.get(entry.userId)}
                    maxPoints={maxPoints}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-white/10 bg-black/28">
            <div className="border-b border-white/10 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                Foto actual
              </div>
              <div className="mt-1 text-2xl font-black">Top ranking</div>
            </div>
            <div className="max-h-full overflow-auto p-3">
              {frame.entries.slice(0, 10).map((entry) => {
                const player = playerByUserId.get(entry.userId);
                return (
                  <div
                    key={entry.userId}
                    className="mb-2 grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-xl bg-white/[0.07] px-3 py-2"
                  >
                    <div className="font-black text-[#27e7ff]">#{entry.rank}</div>
                    <div className="min-w-0">
                      <div className="truncate font-black">{player?.displayName ?? "Jugador"}</div>
                      <div className="text-xs font-semibold text-slate-400">
                        {entry.exactScores} exactos
                      </div>
                    </div>
                    <div className="font-black">{entry.totalPoints}</div>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function RaceBar({
  entry,
  player,
  maxPoints,
}: {
  entry: RankingEvolutionEntry;
  player?: { displayName: string; avatarEmoji: string | null };
  maxPoints: number;
}) {
  const color = colorForId(entry.userId);
  const width = 18 + (entry.totalPoints / maxPoints) * 72;

  return (
    <div
      className="absolute left-[54px] right-4 grid grid-cols-[minmax(190px,1fr)_82px] items-center gap-3 transition-[top] duration-700 ease-out"
      style={{ top: TOP_OFFSET + (entry.rank - 1) * ROW_HEIGHT }}
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-sm font-black">
            <span className="mr-2 text-[#27e7ff]">#{entry.rank}</span>
            {player?.avatarEmoji ? <span className="mr-2">{player.avatarEmoji}</span> : null}
            {player?.displayName ?? "Jugador"}
          </div>
          <div className="text-xs font-black text-slate-300">{entry.totalPoints} pts</div>
        </div>
        <div className="h-7 rounded-r-full bg-white/10">
          <div
            className="h-full rounded-r-full border border-white/20 transition-[width] duration-700 ease-out"
            style={{
              width: `${width}%`,
              background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.82))`,
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] font-black text-slate-300">
        <span>P {entry.matchPoints}</span>
        <span>G {entry.groupPoints}</span>
        <span>KO {entry.knockoutPoints}</span>
        <span>Gol {entry.scorerPoints}</span>
      </div>
    </div>
  );
}

function RankAxis({ count }: { count: number }) {
  return (
    <div className="absolute bottom-0 left-0 top-0 w-[42px]">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 border-t border-white/10 pt-1 text-right text-xs font-black text-slate-500"
          style={{ top: TOP_OFFSET + index * ROW_HEIGHT + 14 }}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}

function PathChart({
  frames,
  frameIndex,
  chartHeight,
  playerIds,
  playerByUserId,
}: {
  frames: RankingEvolutionData["frames"];
  frameIndex: number;
  chartHeight: number;
  playerIds: string[];
  playerByUserId: Map<string, { displayName: string }>;
}) {
  const width = Math.max(740, frames.length * 18);
  const activeFrames = frames.slice(0, frameIndex + 1);

  return (
    <svg
      className="absolute inset-y-0 left-[54px] right-4 h-full w-[calc(100%-70px)] opacity-45"
      viewBox={`0 0 ${width} ${chartHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {playerIds.map((userId) => {
        const points = activeFrames
          .map((frame, index) => {
            const entry = frame.entries.find((item) => item.userId === userId);
            if (!entry) return null;
            const x = frames.length > 1 ? (index / (frames.length - 1)) * width : 0;
            const y = TOP_OFFSET + (entry.rank - 1) * ROW_HEIGHT + 32;
            return `${x},${y}`;
          })
          .filter(Boolean)
          .join(" ");

        return (
          <polyline
            key={userId}
            points={points}
            fill="none"
            stroke={colorForId(userId)}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          >
            <title>{playerByUserId.get(userId)?.displayName ?? "Jugador"}</title>
          </polyline>
        );
      })}
    </svg>
  );
}

function colorForId(id: string) {
  const colors = [
    "#27e7ff",
    "#ff2bd6",
    "#ff7a1a",
    "#3bd16f",
    "#facc15",
    "#a78bfa",
    "#fb7185",
    "#38bdf8",
  ];
  const total = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}
