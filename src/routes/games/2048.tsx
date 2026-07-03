import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GameShell } from "@/components/GameShell";
import { useSwipe } from "@/components/TouchControls";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";


export const Route = createFileRoute("/games/2048")({
  head: () => ({ meta: [{ title: "2048 — IDMgames" }] }),
  component: Game2048,
});

type Grid = number[][];
const SIZE = 4;

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(g: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (g[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const ng = g.map((row) => row.slice());
  ng[r][c] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((v) => v !== 0);
  let gained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      gained += filtered[i];
      filtered.splice(i + 1, 1);
    }
  }
  while (filtered.length < SIZE) filtered.push(0);
  return { row: filtered, gained };
}

function rotate(g: Grid): Grid {
  const n = emptyGrid();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) n[c][SIZE - 1 - r] = g[r][c];
  return n;
}

function move(g: Grid, dir: "left" | "right" | "up" | "down"): { grid: Grid; gained: number; moved: boolean } {
  let rot = 0;
  if (dir === "up") rot = 1;
  if (dir === "right") rot = 2;
  if (dir === "down") rot = 3;
  let cur = g;
  for (let i = 0; i < rot; i++) cur = rotate(cur);
  let gained = 0;
  const next = cur.map((row) => {
    const r = slideRow(row);
    gained += r.gained;
    return r.row;
  });
  for (let i = 0; i < (4 - rot) % 4; i++) cur = rotate(cur);
  let out = next;
  for (let i = 0; i < (4 - rot) % 4; i++) out = rotate(out);
  const moved = JSON.stringify(g) !== JSON.stringify(out);
  return { grid: out, gained, moved };
}

function hasMoves(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (g[r][c] === 0) return true;
    if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) return true;
    if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) return true;
  }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  0: "bg-surface-900/60",
  2: "bg-slate-700 text-slate-100",
  4: "bg-slate-600 text-white",
  8: "bg-indigo-700 text-white",
  16: "bg-indigo-600 text-white",
  32: "bg-purple-600 text-white",
  64: "bg-fuchsia-600 text-white",
  128: "bg-amber-600 text-white",
  256: "bg-amber-500 text-white",
  512: "bg-orange-500 text-white",
  1024: "bg-red-500 text-white",
  2048: "bg-brand-secondary text-white",
};

type MoveDir = "left" | "right" | "up" | "down";
function SwipeArea({ doMove, children }: { doMove: (d: MoveDir) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useSwipe(ref, (d) => doMove(d));
  return (
    <div ref={ref} className="flex flex-col items-center gap-5 touch-none">
      {children}
    </div>
  );
}


function Game2048() {
  const { user } = useAuth();
  const [grid, setGrid] = useState<Grid>(() => addRandom(addRandom(emptyGrid())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const startRef = useRef<number>(Date.now());
  const savedRef = useRef(false);

  const reset = useCallback(() => {
    setGrid(addRandom(addRandom(emptyGrid())));
    setScore(0);
    setOver(false);
    setWon(false);
    startRef.current = Date.now();
    savedRef.current = false;
  }, []);

  const doMove = useCallback((dir: "left" | "right" | "up" | "down") => {
    if (over) return;
    setGrid((g) => {
      const r = move(g, dir);
      if (!r.moved) return g;
      const ng = addRandom(r.grid);
      setScore((s) => {
        const ns = s + r.gained;
        setBest((b) => Math.max(b, ns));
        return ns;
      });
      const reached2048 = ng.some((row) => row.some((v) => v >= 2048));
      if (reached2048) setWon(true);
      if (!hasMoves(ng)) setOver(true);
      return ng;
    });
  }, [over]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const m: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const d = m[e.key];
      if (d) { e.preventDefault(); doMove(d); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  useEffect(() => {
    if ((over || won) && !savedRef.current && user) {
      savedRef.current = true;
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      saveScore({
        gameSlug: "2048",
        score,
        durationSeconds: duration,
        won,
      }).catch(console.error);
    }
  }, [over, won, user, score]);

  return (
    <GameShell
      title="2048"
      category="Логика"
      description="Плъзгай със стрелките, за да обединиш плочките и достигнеш 2048."
      sidebar={
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Точки</p>
              <p className="text-2xl font-bold text-white font-mono">{score}</p>
            </div>
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Рекорд</p>
              <p className="text-2xl font-bold text-brand-secondary font-mono">{best}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
          >
            Нова игра
          </button>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-5 text-sm text-slate-400">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Контроли</p>
            Стрелки или WASD
          </div>
          {!user && (
            <div className="bg-surface-800 border border-brand-primary/30 rounded-xl p-5 text-sm text-slate-300">
              <a href="/auth" className="text-brand-primary font-semibold hover:underline">Влез</a>, за да пазиш резултатите си.
            </div>
          )}
        </>
      }
    >
      <SwipeArea doMove={doMove}>
        <div className="relative bg-surface-900 p-3 rounded-2xl border border-white/10">


          <div className="grid grid-cols-4 gap-3">
            {grid.flatMap((row, r) =>
              row.map((val, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`size-16 sm:size-20 rounded-lg flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all ${TILE_COLORS[val] ?? "bg-brand-primary text-white"}`}
                >
                  {val || ""}
                </div>
              )),
            )}
          </div>
          {(over || won) && (
            <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
              <p className="text-3xl font-bold text-white">{won ? "Победа! 🎉" : "Край на играта"}</p>
              <p className="text-slate-400">Точки: <span className="text-brand-secondary font-bold">{score}</span></p>
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
              >
                Нова игра
              </button>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <div />
          <button onClick={() => doMove("up")} className="p-4 bg-surface-700 rounded-lg text-white">↑</button>
          <div />
          <button onClick={() => doMove("left")} className="p-4 bg-surface-700 rounded-lg text-white">←</button>
          <button onClick={() => doMove("down")} className="p-4 bg-surface-700 rounded-lg text-white">↓</button>
          <button onClick={() => doMove("right")} className="p-4 bg-surface-700 rounded-lg text-white">→</button>
        </div>
      </SwipeArea>

    </GameShell>
  );
}
