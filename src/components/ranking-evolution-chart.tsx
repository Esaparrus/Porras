"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RankingEvolutionData } from "@/lib/ranking-evolution";

export type RankingPoint = {
  day: number;
  rank: number;
};

export type Participant = {
  id: string;
  name: string;
  color: string;
  points: RankingPoint[];
};

export const exampleRankingReplayData: Participant[] = [
  {
    id: "unai",
    name: "Unai",
    color: "#FF3B30",
    points: [
      { day: 0, rank: 5 },
      { day: 1, rank: 3 },
      { day: 2, rank: 1 },
      { day: 3, rank: 2 },
      { day: 4, rank: 4 },
    ],
  },
  {
    id: "aritz",
    name: "Aritz",
    color: "#007AFF",
    points: [
      { day: 0, rank: 1 },
      { day: 1, rank: 2 },
      { day: 2, rank: 4 },
      { day: 3, rank: 3 },
      { day: 4, rank: 1 },
    ],
  },
  {
    id: "bidatz",
    name: "Bidatz",
    color: "#34C759",
    points: [
      { day: 0, rank: 3 },
      { day: 1, rank: 1 },
      { day: 2, rank: 2 },
      { day: 3, rank: 5 },
      { day: 4, rank: 2 },
    ],
  },
];

type AnimatedRankingReplayProps = {
  data: Participant[];
  maxRank: number;
  durationPerStep?: number;
  dayLabels?: string[];
  title?: string;
};

const CHART_WIDTH = 430;
const CHART_LEFT = 52;
const CHART_TOP = 82;
const CHART_RIGHT = 74;
const CHART_BOTTOM = 46;
const DAY_SPACING = 92;

export function AnimatedRankingReplay({
  data,
  maxRank,
  durationPerStep = 900,
  dayLabels,
  title = "Evolucion de la clasificacion",
}: AnimatedRankingReplayProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const startPlayheadRef = useRef(0);
  const latestPlayheadRef = useRef(0);
  const orderedData = useMemo(
    () =>
      data.map((participant) => ({
        ...participant,
        points: participant.points.slice().sort((left, right) => left.day - right.day),
      })),
    [data],
  );
  const allDays = useMemo(() => {
    const days = new Set<number>();
    orderedData.forEach((participant) => {
      participant.points.forEach((point) => days.add(point.day));
    });
    return Array.from(days).sort((left, right) => left - right);
  }, [orderedData]);
  const minDay = allDays[0] ?? 0;
  const maxDay = allDays.at(-1) ?? 0;
  const currentSegment = Math.min(Math.floor(playhead), Math.max(maxDay - 1, 0));
  const segmentProgress = Math.min(1, Math.max(0, playhead - currentSegment));
  const easedDay = currentSegment + easeInOutCubic(segmentProgress);
  const activeDay = Math.round(playhead);
  const chartWidth = CHART_WIDTH;
  const chartHeight = Math.max(
    430,
    CHART_TOP + CHART_BOTTOM + Math.max(1, maxDay - minDay) * DAY_SPACING,
  );
  const finished = hasStarted && playhead >= maxDay;

  useEffect(() => {
    latestPlayheadRef.current = playhead;
  }, [playhead]);

  useEffect(() => {
    if (!isPlaying) return;

    function tick(timestamp: number) {
      if (!startedAtRef.current) startedAtRef.current = timestamp;
      const elapsed = timestamp - startedAtRef.current;
      const nextPlayhead = Math.min(
        maxDay,
        startPlayheadRef.current + elapsed / durationPerStep,
      );

      latestPlayheadRef.current = nextPlayhead;
      setPlayhead(nextPlayhead);

      if (nextPlayhead >= maxDay) {
        setIsPlaying(false);
        frameRef.current = null;
        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    }

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      startedAtRef.current = 0;
      startPlayheadRef.current = latestPlayheadRef.current;
    };
  }, [durationPerStep, isPlaying, maxDay]);

  function play() {
    const nextPlayhead = !hasStarted || finished ? minDay : playhead;
    setHasStarted(true);
    setPlayhead(nextPlayhead);
    startPlayheadRef.current = nextPlayhead;
    startedAtRef.current = 0;
    setIsPlaying(maxDay > minDay);
  }

  function pause() {
    startPlayheadRef.current = playhead;
    startedAtRef.current = 0;
    setIsPlaying(false);
  }

  function restart() {
    startPlayheadRef.current = minDay;
    startedAtRef.current = 0;
    setPlayhead(minDay);
    setHasStarted(true);
    setIsPlaying(false);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#081322] p-4 text-white shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#27e7ff]">
            Replay vertical
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            Jornadas de arriba a abajo. Puestos en la escala superior.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-primary px-4 py-2"
            onClick={play}
            disabled={isPlaying || maxDay <= minDay}
          >
            <Play className="h-4 w-4" />
            Ver evolucion
          </button>
          <button
            type="button"
            className="btn-secondary px-4 py-2"
            onClick={pause}
            disabled={!isPlaying}
          >
            <Pause className="h-4 w-4" />
            Pausar
          </button>
          <button type="button" className="btn-secondary px-4 py-2" onClick={restart}>
            <RotateCcw className="h-4 w-4" />
            Reiniciar
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
        <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">
          {hasStarted ? dayLabels?.[activeDay] ?? `Jornada ${activeDay}` : "Pulsa Play"}
        </div>
        <div className="text-sm font-semibold text-slate-300">
          {hasStarted
            ? `${Math.round(((playhead - minDay) / Math.max(1, maxDay - minDay)) * 100)}%`
            : "El recorrido se dibuja durante la animacion"}
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#050b14]">
        {!hasStarted ? (
          <div className="absolute inset-0 z-10 flex min-h-[430px] items-start justify-center bg-[#050b14]/82 p-6 pt-24 text-center backdrop-blur-sm">
            <div>
              <button type="button" className="btn-primary" onClick={play}>
                <Play className="h-5 w-5" />
                Ver evolucion
              </button>
              <p className="mt-4 max-w-md text-sm font-semibold text-slate-300">
                No se pinta el grafico completo al cargar. El replay empieza en la jornada 0.
              </p>
            </div>
          </div>
        ) : null}

        <svg
          className="block h-auto w-full"
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label="Replay animado de posiciones del ranking"
        >
          <defs>
            <filter id="ranking-dot-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={chartWidth} height={chartHeight} fill="#050b14" />
          <g opacity="0.9">
            {Array.from({ length: maxRank }).map((_, index) => {
              const rank = index + 1;
              const x = xForRank(rank, maxRank);
              return (
                <g key={rank}>
                  <line
                    x1={x}
                    x2={x}
                    y1={CHART_TOP - 26}
                    y2={chartHeight - CHART_BOTTOM + 8}
                    stroke="rgba(255,255,255,0.07)"
                  />
                  <text
                    x={x}
                    y={30}
                    textAnchor="middle"
                    fill={rank === 1 ? "#27e7ff" : "#94a3b8"}
                    fontSize="12"
                    fontWeight="900"
                  >
                    {rank}o
                  </text>
                </g>
              );
            })}

            {allDays.map((day) => {
              const y = yForDay(day, minDay);
              return (
                <g key={day}>
                  <line
                    x1={CHART_LEFT - 8}
                    x2={chartWidth - CHART_RIGHT + 24}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <text
                    x={CHART_LEFT - 16}
                    y={y + 4}
                    textAnchor="end"
                    fill={Math.round(easedDay) === day ? "#ff7a1a" : "#94a3b8"}
                    fontSize="12"
                    fontWeight="900"
                  >
                    J{day}
                  </text>
                </g>
              );
            })}
          </g>

          {hasStarted
            ? orderedData.map((participant) => {
                const current = getInterpolatedPosition(participant.points, easedDay, maxRank);
                const trail = buildTrailPoints(participant.points, easedDay, maxRank);
                const labelAtEnd = current.x > chartWidth - 150;

                return (
                  <g key={participant.id}>
                    <polyline
                      points={trail.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke={participant.color}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.72"
                    />
                    <circle
                      cx={current.x}
                      cy={current.y}
                      r="9"
                      fill={participant.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      filter="url(#ranking-dot-glow)"
                    />
                    <text
                      x={labelAtEnd ? current.x - 14 : current.x + 14}
                      y={current.y + 5}
                      textAnchor={labelAtEnd ? "end" : "start"}
                      fill="#f8fafc"
                      fontSize="12"
                      fontWeight="900"
                      paintOrder="stroke"
                      stroke="#050b14"
                      strokeWidth="5"
                    >
                      {participant.name}
                    </text>
                  </g>
                );
              })
            : null}
        </svg>
      </div>
    </section>
  );
}

export function RankingEvolutionChart({
  data,
}: {
  leagueId: string;
  data: RankingEvolutionData;
}) {
  const participants = useMemo(() => toParticipants(data), [data]);
  const dayLabels = useMemo(() => data.frames.map((frame) => frame.label), [data.frames]);

  return (
    <main className="min-h-screen bg-[#06111f] p-3 text-white sm:p-5">
      <div className="mb-4 flex justify-end">
        <div className="text-right text-xs font-black uppercase tracking-[0.18em] text-slate-300">
          Vista movil vertical
        </div>
      </div>

      {participants.length ? (
        <AnimatedRankingReplay
          data={participants}
          maxRank={Math.max(1, data.players.length)}
          durationPerStep={900}
          dayLabels={dayLabels}
          title="Replay de la clasificacion"
        />
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/[0.08] p-6">
          Todavia no hay datos para pintar la evolucion.
        </section>
      )}
    </main>
  );
}

function toParticipants(data: RankingEvolutionData): Participant[] {
  return data.players.map((player) => ({
    id: player.userId,
    name: player.displayName,
    color: colorForId(player.userId),
    points: data.frames.map((frame, day) => {
      const entry = frame.entries.find((item) => item.userId === player.userId);
      return {
        day,
        rank: entry?.rank ?? data.players.length,
      };
    }),
  }));
}

function buildTrailPoints(points: RankingPoint[], currentDay: number, maxRank: number) {
  const minDay = points[0]?.day ?? 0;
  const trail = points
    .filter((point) => point.day <= Math.floor(currentDay))
    .map((point) => ({
      x: xForRank(point.rank, maxRank),
      y: yForDay(point.day, minDay),
    }));

  const current = getInterpolatedPosition(points, currentDay, maxRank);
  const last = trail.at(-1);
  if (!last || last.x !== current.x || last.y !== current.y) {
    trail.push(current);
  }

  return trail;
}

function getInterpolatedPosition(
  points: RankingPoint[],
  currentDay: number,
  maxRank: number,
) {
  const minDay = points[0]?.day ?? 0;
  const previous = getPointAtOrBefore(points, currentDay);
  const next = getPointAtOrAfter(points, currentDay);
  const span = Math.max(1, next.day - previous.day);
  const amount = Math.min(1, Math.max(0, (currentDay - previous.day) / span));
  const rank = previous.rank + (next.rank - previous.rank) * amount;
  const day = previous.day + (next.day - previous.day) * amount;

  return {
    x: xForRank(rank, maxRank),
    y: yForDay(day, minDay),
  };
}

function getPointAtOrBefore(points: RankingPoint[], day: number) {
  return (
    points
      .slice()
      .reverse()
      .find((point) => point.day <= day) ??
    points[0] ?? { day: 0, rank: 1 }
  );
}

function getPointAtOrAfter(points: RankingPoint[], day: number) {
  return points.find((point) => point.day >= day) ?? points.at(-1) ?? { day: 0, rank: 1 };
}

function xForRank(rank: number, maxRank: number) {
  const normalized = maxRank <= 1 ? 0 : (rank - 1) / (maxRank - 1);
  return CHART_LEFT + normalized * (CHART_WIDTH - CHART_LEFT - CHART_RIGHT);
}

function yForDay(day: number, minDay: number) {
  return CHART_TOP + (day - minDay) * DAY_SPACING;
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function colorForId(id: string) {
  const colors = [
    "#FF3B30",
    "#007AFF",
    "#34C759",
    "#FF9500",
    "#AF52DE",
    "#5AC8FA",
    "#FF2D55",
    "#FFD60A",
    "#64D2FF",
    "#BF5AF2",
  ];
  const total = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}
