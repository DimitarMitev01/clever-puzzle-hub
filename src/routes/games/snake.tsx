import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { DPad, useSwipe } from "@/components/TouchControls";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";


export const Route = createFileRoute("/games/snake")({
  head: () => ({ meta: [{ title: "Snake — IDMgames" }] }),
  component: SnakeGame,
});

const SIZE = 20;
const CELL = 20;
type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

const DIRS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function randomFood(snake: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function SnakeGame() {
  const { user } = useAuth();
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [dir, setDir] = useState<Dir>("right");
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const startRef = useRef<number>(Date.now());
  const dirRef = useRef<Dir>(dir);
  dirRef.current = dir;

  const reset = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 5, y: 5 });
    setDir("right");
    setScore(0);
    setGameOver(false);
    setRunning(true);
    startRef.current = Date.now();
  }, []);

  const endGame = useCallback(async (finalScore: number) => {
    setRunning(false);
    setGameOver(true);
    setBest((b) => Math.max(b, finalScore));
    if (user) {
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      try {
        await saveScore({
          gameSlug: "snake",
          score: finalScore,
          durationSeconds: duration,
          won: false,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const d = DIRS[dirRef.current];
        const nh = { x: head.x + d.x, y: head.y + d.y };
        if (nh.x < 0 || nh.x >= SIZE || nh.y < 0 || nh.y >= SIZE) {
          endGame(prev.length - 1);
          return prev;
        }
        if (prev.some((s) => s.x === nh.x && s.y === nh.y)) {
          endGame(prev.length - 1);
          return prev;
        }
        const grew = nh.x === food.x && nh.y === food.y;
        const next = [nh, ...prev];
        if (!grew) next.pop();
        else {
          setFood(randomFood(next));
          setScore((s) => s + 10);
        }
        return next;
      });
    }, 110);
    return () => clearInterval(interval);
  }, [running, food, endGame]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cur = dirRef.current;
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const nd = map[e.key];
      if (!nd) return;
      if ((cur === "up" && nd === "down") || (cur === "down" && nd === "up") ||
          (cur === "left" && nd === "right") || (cur === "right" && nd === "left")) return;
      setDir(nd);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <GameShell
      title="Snake"
      category="Аркада"
      description="Управлявай със стрелки или WASD. Изяж червената точка, без да се удариш."
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">Резултат</p>
            <p className="text-4xl font-bold text-white font-mono">{score}</p>
            <p className="text-xs text-slate-500 mt-2">Рекорд: <span className="text-brand-secondary font-bold">{best}</span></p>
          </div>
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
      <div className="flex flex-col items-center gap-5">
        <div
          className="relative bg-surface-900 rounded-xl border border-white/10 overflow-hidden"
          style={{ width: SIZE * CELL, height: SIZE * CELL }}
        >
          {snake.map((s, i) => (
            <div
              key={i}
              className={`absolute rounded-sm ${i === 0 ? "bg-brand-primary" : "bg-brand-primary/70"}`}
              style={{ left: s.x * CELL, top: s.y * CELL, width: CELL - 2, height: CELL - 2 }}
            />
          ))}
          <div
            className="absolute rounded-full bg-brand-secondary shadow-[0_0_12px] shadow-brand-secondary"
            style={{ left: food.x * CELL + 2, top: food.y * CELL + 2, width: CELL - 6, height: CELL - 6 }}
          />
          {(!running || gameOver) && (
            <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              {gameOver && (
                <>
                  <p className="text-2xl font-bold text-white">Край на играта</p>
                  <p className="text-slate-400">Резултат: <span className="text-brand-secondary font-bold">{score}</span></p>
                </>
              )}
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
              >
                {gameOver ? "Играй пак" : "Старт"}
              </button>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
