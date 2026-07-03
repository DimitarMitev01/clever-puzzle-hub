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
  const [speed, setSpeed] = useState<1 | 2 | 3>(2);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const startRef = useRef<number>(Date.now());
  const scoreRef = useRef(0);
  const dirRef = useRef<Dir>(dir);
  dirRef.current = dir;

  const reset = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 5, y: 5 });
    setDir("right");
    setScore(0);
    scoreRef.current = 0;
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
        const nh = { x: (head.x + d.x + SIZE) % SIZE, y: (head.y + d.y + SIZE) % SIZE };
        if (prev.some((s) => s.x === nh.x && s.y === nh.y)) {
          endGame(scoreRef.current);
          return prev;
        }
        const grew = nh.x === food.x && nh.y === food.y;
        const next = [nh, ...prev];
        if (!grew) next.pop();
        else {
          setFood(randomFood(next));
          setScore((s) => { const ns = s + 20 * speed; scoreRef.current = ns; return ns; });
        }
        return next;
      });
    }, speed === 1 ? 160 : speed === 2 ? 110 : 70);
    return () => clearInterval(interval);
  }, [running, food, endGame, speed]);

  const changeDir = useCallback((nd: Dir) => {
    const cur = dirRef.current;
    if ((cur === "up" && nd === "down") || (cur === "down" && nd === "up") ||
        (cur === "left" && nd === "right") || (cur === "right" && nd === "left")) return;
    setDir(nd);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const nd = map[e.key];
      if (nd) changeDir(nd);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeDir]);

  const boardRef = useRef<HTMLDivElement>(null);
  useSwipe(boardRef, changeDir);



  return (
    <GameShell
      title="Snake"
      category="Аркада"
      description="Управлявай със стрелки или WASD. Изяй ябълката, без да се удариш. Всяка ябълка носи 20×Speed точки."
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
          <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Speed</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s as 1 | 2 | 3)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-colors ${
                    speed === s
                      ? "bg-brand-primary text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
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
          ref={boardRef}
          className="relative bg-surface-900 rounded-xl border border-white/10 overflow-hidden touch-none max-w-full"
          style={{ width: SIZE * CELL, height: SIZE * CELL }}
        >
          <SnakeSvg snake={snake} food={food} dir={dir} />
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
        <DPad onDir={changeDir} />
      </div>

    </GameShell>
  );
}

function SnakeSvg({ snake, food, dir }: { snake: Point[]; food: Point; dir: Dir }) {
  const W = SIZE * CELL;
  const H = SIZE * CELL;
  const half = CELL / 2;
  const pts = snake.map((s) => ({ x: s.x * CELL + half, y: s.y * CELL + half }));
  const head = pts[0];
  const bodyPath =
    pts.length > 1
      ? "M " + pts.map((p) => `${p.x} ${p.y}`).join(" L ")
      : `M ${head.x} ${head.y} L ${head.x + 0.01} ${head.y}`;

  const d = DIRS[dir];
  const perp = { x: -d.y, y: d.x };
  const eyeF = half * 0.35;
  const eyeS = half * 0.45;
  const eye1 = { x: head.x + d.x * eyeF + perp.x * eyeS, y: head.y + d.y * eyeF + perp.y * eyeS };
  const eye2 = { x: head.x + d.x * eyeF - perp.x * eyeS, y: head.y + d.y * eyeF - perp.y * eyeS };
  const tongueBase = { x: head.x + d.x * half, y: head.y + d.y * half };
  const tongueTip = { x: tongueBase.x + d.x * 8, y: tongueBase.y + d.y * 8 };
  const tongueL = { x: tongueTip.x + perp.x * 3 + d.x * 2, y: tongueTip.y + perp.y * 3 + d.y * 2 };
  const tongueR = { x: tongueTip.x - perp.x * 3 + d.x * 2, y: tongueTip.y - perp.y * 3 + d.y * 2 };

  return (
    <svg width={W} height={H} className="absolute inset-0 pointer-events-none">
      <defs>
        <pattern id="snake-grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
          <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </pattern>
        <radialGradient id="apple" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ff8fa3" />
          <stop offset="60%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
        <linearGradient id="snakeBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#snake-grid)" />

      {/* Apple */}
      <g>
        <circle cx={food.x * CELL + half} cy={food.y * CELL + half} r={half - 3} fill="url(#apple)" />
        <rect x={food.x * CELL + half - 1} y={food.y * CELL + 2} width={2} height={4} fill="#5b3a1a" rx={1} />
        <path
          d={`M ${food.x * CELL + half + 1} ${food.y * CELL + 4} q 4 -2 6 2`}
          stroke="#22c55e" strokeWidth={2} fill="none" strokeLinecap="round"
        />
      </g>

      {/* Body: dark outline + gradient fill for a smooth tube */}
      <path d={bodyPath} stroke="#052e16" strokeWidth={CELL - 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={bodyPath} stroke="url(#snakeBody)" strokeWidth={CELL - 6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.slice(1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.6} fill="#065f46" opacity={0.9} />
      ))}

      {/* Tongue */}
      <polyline points={`${tongueBase.x},${tongueBase.y} ${tongueTip.x},${tongueTip.y}`} stroke="#ef4444" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <polyline points={`${tongueTip.x},${tongueTip.y} ${tongueL.x},${tongueL.y}`} stroke="#ef4444" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <polyline points={`${tongueTip.x},${tongueTip.y} ${tongueR.x},${tongueR.y}`} stroke="#ef4444" strokeWidth={1.5} fill="none" strokeLinecap="round" />

      {/* Head */}
      <circle cx={head.x} cy={head.y} r={half - 2} fill="#16a34a" stroke="#052e16" strokeWidth={1.5} />
      <circle cx={eye1.x} cy={eye1.y} r={2.6} fill="white" />
      <circle cx={eye2.x} cy={eye2.y} r={2.6} fill="white" />
      <circle cx={eye1.x + d.x * 0.8} cy={eye1.y + d.y * 0.8} r={1.3} fill="#0f172a" />
      <circle cx={eye2.x + d.x * 0.8} cy={eye2.y + d.y * 0.8} r={1.3} fill="#0f172a" />
    </svg>
  );
}
