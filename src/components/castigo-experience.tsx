"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { completeCastigoAction } from "@/app/actions";

// ---------------------------------------------------------------------------
// Broma: pantalla "hackeada" estilo Matrix -> pizarra con Edna y Bart.
// El nombre que aparece es el del usuario que ha entrado (userName), no uno fijo.
// mode "real" = castigo activo (al terminar entra a su liga); "preview" = prueba.
// ---------------------------------------------------------------------------

const PHRASE = "No volveré a meterme con Esparrus";
const TIMES = 5;

// Normaliza para comparar: minusculas, sin acentos, sin signos, espacios simples.
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Phase = "hack" | "board" | "done";

export function CastigoExperience({
  userName,
  mode,
  leagueId,
}: {
  userName: string;
  mode: "real" | "preview";
  leagueId: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("hack");
  const [typed, setTyped] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const writtenRef = useRef<HTMLDivElement | null>(null);

  const hackText = [
    "ACCESO INTERCEPTADO",
    "",
    `> Detectando intruso... ${userName.toUpperCase()}`,
    "> ERROR 0xVACILE: implementando castigo por vacilar al creador de la porra",
    "> Reescribiendo privilegios de usuario...",
    "> Acceso a la Porra BLOQUEADO.",
  ].join("\n");

  // ---- Fase 1: lluvia Matrix sobre canvas -------------------------------
  useEffect(() => {
    if (phase !== "hack") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars =
      "アカサタナハマヤラワガザダバパ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@".split("");
    let columns = 0;
    let drops: number[] = [];

    function resize() {
      const w = canvas!.clientWidth || window.innerWidth;
      const h = canvas!.clientHeight || window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
      columns = Math.floor(w / 16);
      drops = new Array(columns).fill(1);
    }
    resize();
    window.addEventListener("resize", resize);

    const interval = window.setInterval(() => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff66";
      ctx.font = "15px monospace";
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 16, drops[i] * 16);
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 45);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, [phase]);

  // ---- Fase 1: efecto maquina de escribir del mensaje --------------------
  useEffect(() => {
    if (phase !== "hack") return;
    setTyped("");
    let i = 0;
    const interval = window.setInterval(() => {
      i++;
      setTyped(hackText.slice(0, i));
      if (i >= hackText.length) window.clearInterval(interval);
    }, 28);
    return () => window.clearInterval(interval);
  }, [phase, hackText]);

  // Ancla la pantalla al area realmente visible (visual viewport). Asi, cuando
  // se abre el teclado en el movil, NO se empuja todo hacia arriba: la pizarra
  // sigue viendose y la casilla queda justo encima del teclado.
  useEffect(() => {
    const vv = window.visualViewport;
    const root = rootRef.current;
    if (!vv || !root) return;
    const apply = () => {
      root.style.height = `${vv.height}px`;
      root.style.top = `${vv.offsetTop}px`;
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  // Cada vez que se apunta una linea, baja el scroll de la pizarra para que la
  // ultima quede a la vista (encima de la casilla).
  useEffect(() => {
    const el = writtenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function submitLine() {
    if (normalize(input) === normalize(PHRASE)) {
      const next = [...lines, PHRASE];
      setLines(next);
      setInput("");
      setWrong(false);
      if (next.length >= TIMES) {
        window.setTimeout(() => setPhase("done"), 600);
      }
    } else {
      setWrong(true);
      window.setTimeout(() => setWrong(false), 600);
    }
  }

  function finish() {
    if (mode === "real" && leagueId) {
      startTransition(() => {
        completeCastigoAction(leagueId);
      });
    } else {
      window.location.href = "/dashboard";
    }
  }

  const remaining = Math.max(0, TIMES - lines.length);

  return (
    <div className="castigo-root" ref={rootRef}>
      <style>{CSS}</style>

      {/* ---------------- FASE 1: HACKEO ---------------- */}
      {phase === "hack" && (
        <button
          type="button"
          className="hack"
          onPointerDown={() => setPhase("board")}
          onClick={() => setPhase("board")}
          aria-label="Continuar"
        >
          <canvas ref={canvasRef} className="matrix" />
          <div className="crt" />
          <div className="hack-panel">
            <pre className="hack-text">
              {typed}
              <span className="caret">▋</span>
            </pre>
            <p className="hack-cta">[ toca la pantalla para continuar ]</p>
          </div>
        </button>
      )}

      {/* ---------------- FASE 2: PIZARRA ---------------- */}
      {phase === "board" && (
        <div className={`board-scene${typing ? " typing" : ""}`}>
          <button
            type="button"
            className="info-btn"
            aria-label="Instrucciones"
            onClick={() => setShowInfo((v) => !v)}
          >
            i
          </button>

          {showInfo && (
            <div className="info-pop" onClick={() => setShowInfo(false)}>
              <div className="info-card" onClick={(e) => e.stopPropagation()}>
                <h3>¿Qué tengo que hacer?</h3>
                <p>
                  Has vacilado al creador de la porra. Tu castigo: escribir{" "}
                  <strong>{TIMES} veces</strong> en la pizarra la frase:
                </p>
                <p className="info-phrase">«{PHRASE}»</p>
                <p>
                  Escríbela en la casilla de abajo y pulsa <strong>Enter</strong>.
                  Cada vez que la escribas bien, se queda apuntada en la pizarra.
                  Cuando llegues a {TIMES}, entrarás a la porra.
                </p>
                <button className="info-close" onClick={() => setShowInfo(false)}>
                  Vale
                </button>
              </div>
            </div>
          )}

          <div className="frame">
            <div className="board">
              <p className="assignment">Escribe {TIMES} veces:</p>
              <div className="written" ref={writtenRef}>
                {lines.map((line, idx) => (
                  <p key={idx} className="chalk-line" style={lineStyle(idx)}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
            <div className="ledge">
              <span className="chalk-stick" />
              <span className="sponge" />
            </div>
            <img src="/castigo/edna.png" alt="La profesora" className="char char-edna" />
            <img src="/castigo/bart.png" alt="Bart" className="char char-bart" />
          </div>

          <form
            className="controls"
            onSubmit={(e) => {
              e.preventDefault();
              submitLine();
            }}
          >
            <p className="counter">
              Te quedan <strong>{remaining}</strong> de {TIMES}
            </p>
            <input
              ref={inputRef}
              className={`line-input ${wrong ? "shake" : ""}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              enterKeyHint="enter"
              placeholder={PHRASE}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button type="submit" className="enter-btn">
              Apuntar en la pizarra (Enter)
            </button>
            {wrong && <p className="wrong-msg">¡Mal escrito! Cópiala igual.</p>}
          </form>
        </div>
      )}

      {/* ---------------- FASE 3: HECHO ---------------- */}
      {phase === "done" && (
        <div className="done-scene">
          <div className="done-card">
            <div className="done-emoji">✅</div>
            <h2>Castigo cumplido</h2>
            <p>Has aprendido la lección, {userName}. Ya puedes entrar a la porra.</p>
            <button
              type="button"
              className="done-btn"
              onClick={finish}
              disabled={isPending}
            >
              {isPending ? "Entrando…" : "Entrar a la porra →"}
            </button>
            {mode === "preview" && (
              <p className="preview-note">
                (Vista previa — al activarlo de verdad, esto te llevará directo a tu
                porra)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Pequeña variacion por linea para que parezca escrito a mano.
function lineStyle(idx: number): React.CSSProperties {
  const tilt = ((idx % 3) - 1) * 0.6;
  const shift = (idx % 2 === 0 ? 1 : -1) * (idx % 4);
  return { transform: `rotate(${tilt}deg) translateX(${shift}px)` };
}

const CSS = `
.castigo-root { position: fixed; top: 0; left: 0; right: 0; height: 100dvh;
  overflow: hidden; font-family: Arial, Helvetica, sans-serif; }

/* ---- Fase hackeo ---- */
.hack { position: absolute; inset: 0; width: 100%; height: 100%; background: #000;
  cursor: pointer; border: 0; margin: 0; padding: 0; appearance: none; -webkit-appearance: none;
  color: inherit; font: inherit; text-align: inherit; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent; }
.matrix { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
.crt { position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0, rgba(0,0,0,0.18) 1px, transparent 2px, transparent 3px); }
.hack-panel { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 22px; text-align: left; }
.hack-text { color: #4dff88; font-family: "Courier New", monospace; font-weight: 700;
  font-size: clamp(13px, 3.6vw, 22px); line-height: 1.5; white-space: pre-wrap; word-break: break-word;
  max-width: 760px; margin: 0; text-shadow: 0 0 8px rgba(0,255,102,0.65);
  background: rgba(0,0,0,0.55); border: 1px solid rgba(0,255,102,0.35); border-radius: 10px;
  padding: 18px 20px; animation: flicker 3.5s infinite; }
.caret { animation: blink 1s steps(1) infinite; }
.hack-cta { margin-top: 22px; color: #9dffc4; font-weight: 800;
  font-size: clamp(12px, 3.2vw, 17px); animation: blink 1.1s steps(1) infinite;
  text-shadow: 0 0 6px rgba(0,255,102,0.6); }
@keyframes blink { 50% { opacity: 0; } }
@keyframes flicker { 0%,19%,21%,100% { opacity: 1; } 20% { opacity: 0.82; } 50% { opacity: 0.96; } }

/* ---- Fase pizarra ---- */
.board-scene { position: absolute; inset: 0; background: #1b1f24;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  gap: 12px; padding: 14px 14px 16px; overflow: hidden; }

.info-btn { position: fixed; top: 14px; right: 14px; z-index: 30;
  width: 40px; height: 40px; border-radius: 999px; border: 2px solid #fff;
  background: rgba(0,0,0,0.55); color: #fff; font-weight: 900; font-style: italic;
  font-size: 20px; cursor: pointer; line-height: 1; }
.info-btn:hover { background: rgba(255,255,255,0.15); }

.info-pop { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; padding: 20px; }
.info-card { background: #0f1722; border: 1px solid rgba(255,255,255,0.16); border-radius: 18px;
  max-width: 420px; padding: 22px; color: #e8eef6; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.info-card h3 { font-size: 20px; font-weight: 900; margin-bottom: 10px; }
.info-card p { font-size: 14px; line-height: 1.5; margin-top: 8px; color: #cfd9e6; }
.info-phrase { font-style: italic; color: #fff !important; font-weight: 800; }
.info-close { margin-top: 16px; width: 100%; background: #ff2bd6; color: #fff; border: 3px solid #000;
  box-shadow: 5px 5px 0 #000; font-weight: 900; text-transform: uppercase; padding: 12px; cursor: pointer; }

.frame { position: relative; width: min(94vw, 760px); border-radius: 10px; padding: 14px;
  background: linear-gradient(180deg, #8a5a2b, #6b4220); box-shadow: 0 18px 40px rgba(0,0,0,0.5);
  border: 3px solid #4d2f16; flex: 1 1 auto; min-height: 0;
  display: flex; flex-direction: column; }
.board { position: relative; border-radius: 6px; flex: 1 1 auto; min-height: 110px;
  display: flex; flex-direction: column;
  background: radial-gradient(circle at 30% 20%, #2f5d43, #1f3d2c 70%);
  box-shadow: inset 0 0 60px rgba(0,0,0,0.45); padding: 14px 16px 16px;
  overflow: hidden; }
.assignment { flex: 0 0 auto; color: rgba(255,255,255,0.92); font-size: clamp(15px, 4vw, 22px);
  font-weight: 700; margin-bottom: 8px; padding-bottom: 6px;
  border-bottom: 2px dashed rgba(255,255,255,0.25);
  font-family: "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive;
  text-shadow: 0 0 1px rgba(255,255,255,0.6); }
.written { flex: 1 1 auto; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; gap: 2px; padding-right: 6px; }
.chalk-line { color: #f3f7f0; font-size: clamp(13px, 3.4vw, 19px); line-height: 1.45;
  font-family: "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive;
  text-shadow: 0 0 1px rgba(255,255,255,0.55); letter-spacing: 0.5px;
  animation: chalkIn 220ms ease-out; }
@keyframes chalkIn { from { opacity: 0; filter: blur(2px); } to { opacity: 1; filter: blur(0); } }
.char { position: absolute; bottom: -10px; object-fit: contain; pointer-events: none;
  filter: drop-shadow(0 6px 8px rgba(0,0,0,0.45)); z-index: 2; }
.char-edna { left: -4px; width: 26%; max-width: 130px; }
.char-bart { right: -4px; width: 28%; max-width: 145px; }

.ledge { flex: 0 0 auto; height: 16px; margin-top: 8px; border-radius: 4px;
  background: linear-gradient(180deg, #9b6630, #5e3a1b); position: relative;
  box-shadow: 0 4px 8px rgba(0,0,0,0.4); }
.chalk-stick { position: absolute; left: 18%; top: -3px; width: 34px; height: 7px;
  border-radius: 3px; background: #f6f3e7; box-shadow: 0 1px 2px rgba(0,0,0,0.4); }
.sponge { position: absolute; right: 16%; top: -5px; width: 26px; height: 12px;
  border-radius: 3px; background: linear-gradient(180deg, #f5d04a, #c98a2a); }

.controls { flex: 0 0 auto; width: min(94vw, 760px); display: flex; flex-direction: column; gap: 8px; }
/* Al escribir (teclado abierto) la pizarra se encoge: ocultamos a los personajes
   para que no tapen el texto, y se ve bien como se apunta cada linea. */
.board-scene.typing .char { display: none; }
.board-scene.typing .ledge { display: none; }
.counter { color: #cfd9e6; font-size: 14px; font-weight: 700; }
.counter strong { color: #ffd23f; font-size: 18px; }
.line-input { width: 100%; padding: 14px 16px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.08); color: #fff; font-size: 16px; outline: none; }
.line-input:focus { border-color: #ff2bd6; background: rgba(255,255,255,0.12); }
.line-input::placeholder { color: rgba(255,255,255,0.35); }
.shake { animation: shake 0.4s; border-color: #ff5b5b !important; }
@keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-7px); }
  40%,80% { transform: translateX(7px); } }
.enter-btn { width: 100%; background: #27e7ff; color: #07111f; border: 3px solid #000;
  box-shadow: 5px 5px 0 #000; font-weight: 900; text-transform: uppercase; padding: 13px; cursor: pointer; }
.enter-btn:active { box-shadow: 2px 2px 0 #000; transform: translate(3px,3px); }
.wrong-msg { color: #ff7a7a; font-weight: 800; font-size: 14px; text-align: center; }

/* ---- Fase hecho ---- */
.done-scene { position: absolute; inset: 0; background: radial-gradient(circle at 50% 30%, #143020, #06111f);
  display: flex; align-items: center; justify-content: center; padding: 22px; }
.done-card { text-align: center; max-width: 420px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14); border-radius: 22px; padding: 30px 24px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.done-emoji { font-size: 56px; }
.done-card h2 { color: #fff; font-size: 26px; font-weight: 900; margin-top: 8px; }
.done-card p { color: #cfd9e6; font-size: 15px; line-height: 1.5; margin-top: 10px; }
.done-btn { display: inline-block; margin-top: 18px; background: #ff2bd6; color: #fff;
  border: 4px solid #000; box-shadow: 6px 6px 0 #000; font-weight: 900; text-transform: uppercase;
  padding: 14px 22px; text-decoration: none; cursor: pointer; }
.done-btn:disabled { opacity: 0.6; cursor: default; }
.preview-note { font-size: 12px !important; color: #8aa0b8 !important; margin-top: 16px !important; }
`;
