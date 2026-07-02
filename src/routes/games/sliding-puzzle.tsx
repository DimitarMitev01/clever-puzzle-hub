import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/games/sliding-puzzle")({
  head: () => ({ meta: [{ title: "Нареди числата — IDMgames" }] }),
  component: SlidingPuzzleGame,
});

type Size = 3 | 4 | 5;

function makeSolved(n: number): number[] {
  const a = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
  return a; // last element is 0 (empty)
}

function isSolvable(tiles: number[], n: number): boolean {
  let inv = 0;
  const arr = tiles.filter((v) => v !== 0);
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) if (arr[i] > arr[j]) inv++;
  if (n % 2 === 1) return inv % 2 === 0;
  const blankRowFromBottom = n - Math.floor(tiles.indexOf(0) / n);
  return (inv + blankRowFromBottom) % 2 === 0;
}

function shuffle(n: number): number[] {
  const solved = makeSolved(n);
  while (true) {
    const a = solved.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (isSolvable(a, n) && a.some((v, i) => v !== solved[i])) return a;
  }
}

function isSolved(tiles: number[]): boolean {
  const n = Math.sqrt(tiles.length);
  const solved = makeSolved(n);
  return tiles.every((v, i) => v === solved[i]);
}

function SlidingPuzzleGame() {
  const { user } = useAuth();
  const [size, setSize] = useState<Size>(4);
  const [tiles, setTiles] = useState<number[]>(() => shuffle(4));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);

  const reset = useCallback((n: Size) => {
    setTiles(shuffle(n));
    setMoves(0);
    setWon(false);
    startRef.current = Date.now();
    setElapsed(0);
    savedRef.current = false;
  }, []);

  useEffect(() => {
    if (won) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [won]);

  const move = useCallback(
    (idx: number) => {
      if (won) return;
      const n = size;
      const empty = tiles.indexOf(0);
      const r1 = Math.floor(idx / n),
        c1 = idx % n;
      const r2 = Math.floor(empty / n),
        c2 = empty % n;
      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
      const nt = tiles.slice();
      [nt[idx], nt[empty]] = [nt[empty], nt[idx]];
      setTiles(nt);
      setMoves((m) => m + 1);
      if (isSolved(nt)) setWon(true);
    },
    [tiles, size, won],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (won) return;
      const n = size;
      const empty = tiles.indexOf(0);
      const r = Math.floor(empty / n),
        c = empty % n;
      let target = -1;
      if (e.key === "ArrowUp" && r < n - 1) target = (r + 1) * n + c;
      if (e.key === "ArrowDown" && r > 0) target = (r - 1) * n + c;
      if (e.key === "ArrowLeft" && c < n - 1) target = r * n + (c + 1);
      if (e.key === "ArrowRight" && c > 0) target = r * n + (c - 1);
      if (target >= 0) {
        e.preventDefault();
        move(target);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tiles, size, move, won]);

  useEffect(() => {
    if (won && !savedRef.current && user) {
      savedRef.current = true;
      const score = Math.max(0, 5000 - elapsed * 3 - moves * 5);
      saveScore({
        gameSlug: "sliding-puzzle",
        score,
        durationSeconds: elapsed,
        won: true,
        metadata: { size, moves },
      }).catch(console.error);
    }
  }, [won, user, elapsed, moves, size]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <GameShell
      title="Нареди числата"
      category="Логика"
      description="Плъзгай плочките, за да ги подредиш по ред от 1 до N."
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Размер</p>
            <div className="grid grid-cols-3 gap-2">
              {([3, 4, 5] as Size[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSize(s);
                    reset(s);
                  }}
                  className={`px-2 py-2 text-xs font-bold rounded-md transition-colors ${
                    size === s
                      ? "bg-brand-primary text-white"
                      : "bg-surface-700 text-slate-300 hover:bg-surface-700/70"
                  }`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Ходове</p>
              <p className="text-2xl font-bold text-white font-mono">{moves}</p>
            </div>
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Време</p>
              <p className="text-2xl font-bold text-brand-secondary font-mono">{mm}:{ss}</p>
            </div>
          </div>
          <button
            onClick={() => reset(size)}
            className="w-full py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
          >
            Разбъркай
          </button>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-5 text-sm text-slate-400">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Контроли</p>
            Клик върху плочка до празното място, или стрелки от клавиатурата.
          </div>
          {!user && (
            <div className="bg-surface-800 border border-brand-primary/30 rounded-xl p-5 text-sm text-slate-300">
              <a href="/auth" className="text-brand-primary font-semibold hover:underline">Влез</a>, за да пазиш резултатите си.
            </div>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-5">
        <div
          className="grid gap-2 p-2 bg-surface-900 rounded-2xl border border-white/10"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {tiles.map((v, i) => (
            <button
              key={i}
              onClick={() => v !== 0 && move(i)}
              className={`size-16 sm:size-20 rounded-lg flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all ${
                v === 0
                  ? "bg-transparent cursor-default"
                  : "bg-brand-primary/80 text-white hover:bg-brand-primary"
              }`}
            >
              {v || ""}
            </button>
          ))}
        </div>

        {won && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white mb-1">Победа! 🎉</p>
            <p className="text-slate-300 text-sm">
              Ходове: <span className="font-mono text-emerald-400">{moves}</span> · Време:{" "}
              <span className="font-mono text-emerald-400">{mm}:{ss}</span>
            </p>
          </div>
        )}
      </div>
    </GameShell>
  );
}
