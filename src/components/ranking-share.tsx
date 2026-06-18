"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { formatCurrency } from "@/lib/league-insights";
import { cn } from "@/lib/utils";

export type ShareRow = {
  position: number;
  name: string;
  avatarEmoji?: string | null;
  points: number;
  prize: number;
  paid: boolean;
};

const MEDALS = ["🥇", "🥈", "🥉"];

// Visual heights for the podium pedestals, indexed by finishing position.
const PEDESTAL_HEIGHT: Record<number, number> = { 1: 132, 2: 104, 3: 84 };
const PEDESTAL_BG: Record<number, string> = {
  1: "linear-gradient(180deg,#f6c344,#c99322)",
  2: "linear-gradient(180deg,#dbe4f0,#9aa7bd)",
  3: "linear-gradient(180deg,#d69659,#a86a36)",
};
const PEDESTAL_TEXT: Record<number, string> = {
  1: "#1f1600",
  2: "#111827",
  3: "#1f1307",
};

// Small context chip shown in the poster header (progress stats).
function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "6px 14px",
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 900, color: accent, lineHeight: 1 }}>
        {value}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Loud "pay up" tag shown next to players who haven't paid.
function MorosoTag({ big = false }: { big?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: big ? 17 : 14,
        fontWeight: 900,
        color: "#ffffff",
        background: "#dc2626",
        padding: big ? "3px 12px" : "2px 9px",
        borderRadius: 8,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: 1.15,
        whiteSpace: "nowrap",
      }}
    >
      Moroso · Paga
    </span>
  );
}

export type ShareProgress = {
  /** Percentage of points already resolved (0-100). */
  pointsPercentage: number;
  /** Points still up for grabs. */
  remainingPoints: number;
  finishedMatches: number;
  totalMatches: number;
};

export function RankingShareButton({
  leagueName,
  rows,
  progress = null,
  previewMode = false,
}: {
  leagueName: string;
  rows: ShareRow[];
  /** Optional progress context shown on the exported image. */
  progress?: ShareProgress | null;
  /** When true, the poster is shown on-screen (for previews) instead of off-screen. */
  previewMode?: boolean;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  // Whether this device can share image files via the native share sheet
  // (mobile). Detected on mount with a dummy file so the button label matches
  // what will actually happen.
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    try {
      const probe = new File(["x"], "probe.png", { type: "image/png" });
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [probe] })
      ) {
        setCanShareFiles(true);
      }
    } catch {
      // Older browsers without the File/Share APIs: stay in download mode.
    }
  }, []);

  // Renders the poster to a PNG blob. We build the SVG with html-to-image
  // (fast and reliable) and rasterize it ourselves via a plain <img> + canvas,
  // because the library's own rasterizer relies on Image.decode() +
  // requestAnimationFrame, which can stall in some browsers/webviews.
  // The poster uses a system font stack, so font embedding is skipped.
  async function renderPosterBlob(): Promise<Blob> {
    const node = posterRef.current;
    if (!node) throw new Error("Poster no disponible");
    const { toSvg } = await import("html-to-image");
    const scale = 2;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const svgUrl = await toSvg(node, { skipFonts: true });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No se pudo cargar el SVG"));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.fillStyle = "#050b16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo generar el PNG"));
      }, "image/png");
    });
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.click();
    // Release the object URL on the next tick (after the click is handled).
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `clasificacion-${date}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (
        canShareFiles &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `Clasificación · ${leagueName}`,
            text: `Clasificación · ${leagueName}`,
          });
        } catch (err) {
          // The user cancelling the share sheet throws AbortError: ignore it.
          if ((err as Error)?.name !== "AbortError") {
            // If sharing failed for another reason, fall back to a download.
            downloadBlob(blob, fileName);
          }
        }
      } else {
        downloadBlob(blob, fileName);
      }
    } catch (err) {
      console.error("No se pudo generar la imagen", err);
      window.alert("No se pudo generar la imagen. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const podium = rows.slice(0, 3);
  // Display order: 2nd on the left, 1st in the center, 3rd on the right.
  const podiumOrder = [1, 0, 2]
    .map((i) => podium[i])
    .filter((row): row is ShareRow => Boolean(row));
  const rest = rows.slice(3);

  // Distance to the position above, mirroring the web ranking table:
  // 2nd vs 1st, 3rd vs 2nd, and everyone from 4th down vs the podium (3rd).
  const gapInfo = (row: ShareRow) => {
    const i = row.position - 1;
    if (i <= 0) return null;
    let reference: number;
    let label: string;
    if (i === 1) {
      reference = rows[0]?.points ?? row.points;
      label = "vs 1º";
    } else if (i === 2) {
      reference = rows[1]?.points ?? row.points;
      label = "vs 2º";
    } else {
      reference = rows[2]?.points ?? row.points;
      label = "al podio";
    }
    return { gap: Math.max(0, reference - row.points), label };
  };
  const dateLabel = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={busy || rows.length === 0}
        className="inline-flex items-center gap-2 rounded-full bg-[#27e7ff] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#04121d] shadow-lg shadow-[#27e7ff]/30 ring-1 ring-[#27e7ff]/60 transition hover:bg-[#5cf0ff] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : canShareFiles ? (
          <Share2 className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {busy
          ? "Generando..."
          : canShareFiles
            ? "Compartir imagen"
            : "Descargar imagen"}
      </button>

      {/* Poster used as the source for the PNG export. Off-screen by default;
          shown on-screen in previewMode so the design can be inspected. */}
      <div
        aria-hidden={previewMode ? undefined : "true"}
        style={
          previewMode
            ? { marginTop: 16 }
            : {
                position: "absolute",
                left: "-99999px",
                top: 0,
                pointerEvents: "none",
              }
        }
      >
        <div
          ref={posterRef}
          style={{
            width: 640,
            background:
              "radial-gradient(circle at 20% -10%,rgba(39,231,255,0.18),transparent 45%),radial-gradient(circle at 90% 0%,rgba(239,68,68,0.18),transparent 40%),#050b16",
            color: "#ffffff",
            fontFamily:
              "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
            padding: "32px 28px 28px",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#27e7ff",
              }}
            >
              Clasificación
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1.1,
                marginTop: 6,
              }}
            >
              {leagueName}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#94a3b8",
                marginTop: 6,
                textTransform: "capitalize",
              }}
            >
              {dateLabel}
            </div>
            {progress ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <StatChip
                  label="Porra jugada"
                  value={`${progress.pointsPercentage}%`}
                  accent="#27e7ff"
                />
                <StatChip
                  label="Puntos en juego"
                  value={`${progress.remainingPoints}`}
                  accent="#fcd34d"
                />
                <StatChip
                  label="Partidos"
                  value={`${progress.finishedMatches}/${progress.totalMatches}`}
                  accent="#4ade80"
                />
              </div>
            ) : null}
          </div>

          {/* Podium */}
          {podiumOrder.length > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 12,
                marginBottom: 22,
              }}
            >
              {podiumOrder.map((row) => {
                const height = PEDESTAL_HEIGHT[row.position] ?? 84;
                const gap = gapInfo(row);
                return (
                  <div
                    key={row.position}
                    style={{
                      flex: 1,
                      maxWidth: 190,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 30, lineHeight: 1 }}>
                      {MEDALS[row.position - 1] ?? "🏅"}
                    </div>
                    {row.avatarEmoji ? (
                      <div style={{ fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>
                        {row.avatarEmoji}
                      </div>
                    ) : null}
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        marginTop: 6,
                        textAlign: "center",
                        maxWidth: 170,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.name}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: "#27e7ff",
                        lineHeight: 1.1,
                      }}
                    >
                      {row.points}
                      <span
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginLeft: 3,
                        }}
                      >
                        pts
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: gap ? "#94a3b8" : "#fcd34d",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginTop: 2,
                      }}
                    >
                      {gap
                        ? gap.gap === 0
                          ? `= ${gap.label}`
                          : `-${gap.gap} ${gap.label}`
                        : "Líder"}
                    </div>
                    {!row.paid ? (
                      <div style={{ marginTop: 6, marginBottom: 6 }}>
                        <MorosoTag big />
                      </div>
                    ) : row.prize > 0 ? (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: "#fcd34d",
                          marginTop: 4,
                          marginBottom: 6,
                        }}
                      >
                        {formatCurrency(row.prize)}
                      </div>
                    ) : (
                      <div style={{ height: 6 }} />
                    )}
                    <div
                      style={{
                        width: "100%",
                        height,
                        borderRadius: "14px 14px 0 0",
                        background: PEDESTAL_BG[row.position],
                        color: PEDESTAL_TEXT[row.position],
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: 10,
                        fontSize: 38,
                        fontWeight: 900,
                      }}
                    >
                      {row.position}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Rest of the table */}
          {rest.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rest.map((row) => {
                const danger = !row.paid;
                const gap = gapInfo(row);
                return (
                  <div
                    key={row.position}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 14,
                      background: danger
                        ? "rgba(220,38,38,0.16)"
                        : "rgba(255,255,255,0.05)",
                      border: danger
                        ? "1px solid rgba(248,113,113,0.55)"
                        : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 900,
                        background: danger
                          ? "rgba(248,113,113,0.28)"
                          : "rgba(255,255,255,0.1)",
                        color: danger ? "#fecaca" : "#27e7ff",
                      }}
                    >
                      {row.position}
                    </div>
                    {row.avatarEmoji ? (
                      <div style={{ fontSize: 19, lineHeight: 1, flexShrink: 0 }}>
                        {row.avatarEmoji}
                      </div>
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: danger ? "#fecaca" : "#ffffff",
                        }}
                      >
                        {row.name}
                      </div>
                      {danger ? (
                        <div style={{ marginTop: 4 }}>
                          <MorosoTag big />
                        </div>
                      ) : null}
                    </div>
                    {row.prize > 0 ? (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: "#fcd34d",
                          flexShrink: 0,
                        }}
                      >
                        {formatCurrency(row.prize)}
                      </div>
                    ) : null}
                    <div
                      style={{
                        flexShrink: 0,
                        textAlign: "right",
                        minWidth: 64,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: danger ? "#fca5a5" : "#27e7ff",
                          lineHeight: 1.1,
                        }}
                      >
                        {row.points}
                        <span
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            marginLeft: 3,
                          }}
                        >
                          pts
                        </span>
                      </div>
                      {gap ? (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            marginTop: 2,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {gap.gap === 0
                            ? `= ${gap.label}`
                            : `-${gap.gap} ${gap.label}`}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Footer */}
          <div
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            <span>{rows.length} participantes</span>
            <span style={{ color: "#27e7ff" }}>Porras</span>
          </div>
        </div>
      </div>
    </>
  );
}
