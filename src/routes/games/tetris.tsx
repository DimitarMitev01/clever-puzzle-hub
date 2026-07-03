import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { TetrisPad } from "@/components/TouchControls";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";


export const Route = createFileRoute("/games/tetris")({
  head: () => ({ meta: [{ title: "Тетрис — IDMgames" }] }),
  component: TetrisGame,
});

const COLS = 10;
const ROWS = 20;

type Cell = number; // 0 empty, 1-7 piece type
type Board = Cell[][];

const SHAPES: number[][][][] = [
  // I
  [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
  ],
  // O
  [[[2, 2], [2, 2]]],
  // T
  [
    [[0, 3, 0], [3, 3, 3]],
    [[3, 0], [3, 3], [3, 0]],
    [[3, 3, 3], [0, 3, 0]],
    [[0, 3], [3, 3], [0, 3]],
  ],
  // S
  [
    [[0, 4, 4], [4, 4, 0]],
    [[4, 0], [4, 4], [0, 4]],
  ],
  // Z
  [
    [[5, 5, 0], [0, 5, 5]],
    [[0, 5], [5, 5], [5, 0]],
  ],
  // J
  [
    [[6, 0, 0], [6, 6, 6]],
    [[6, 6], [6, 0], [6, 0]],
    [[6, 6, 6], [0, 0, 6]],
    [[0, 6], [0, 6], [6, 6]],
  ],
  // L
  [
    [[0, 0, 7], [7, 7, 7]],
    [[7, 0], [7, 0], [7, 7]],
    [[7, 7, 7], [7, 0, 0]],
    [[7, 7], [0, 7], [0, 7]],
  ],
];

const COLORS: Record<number, string> = {
  0: "bg-surface-900/40",
  1: "bg-cyan-400",
  2: "bg-yellow-400",
  3: "bg-purple-400",
  4: "bg-green-400",
  5: "bg-red-400",
  6: "bg-blue-400",
  7: "bg-orange-400",
};

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

type Piece = { type: number; rot: number; r: number; c: number };

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 7);
  return { type, rot: 0, r: 0, c: Math.floor(COLS / 2) - 1 };
}

function shape(p: Piece): number[][] {
  return SHAPES[p.type][p.rot % SHAPES[p.type].length];
}

function collides(board: Board, p: Piece): boolean {
  const s = shape(p);
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue;
      const br = p.r + r;
      const bc = p.c + c;
      if (bc < 0 || bc >= COLS || br >= ROWS) return true;
      if (br >= 0 && board[br][bc]) return true;
    }
  }
  return false;
}

function merge(board: Board, p: Piece): Board {
  const nb = board.map((row) => row.slice());
  const s = shape(p);
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (s[r][c] && p.r + r >= 0) nb[p.r + r][p.c + c] = s[r][c];
    }
  }
  return nb;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((v) => !v));
  const cleared = ROWS - kept.length;
  const nb = Array.from({ length: cleared }, () => Array(COLS).fill(0)).concat(kept);
  return { board: nb, cleared };
}

function TetrisGame() {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [piece, setPiece] = useState<Piece>(randomPiece);
  const [next, setNext] = useState<Piece>(randomPiece);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);

  const reset = () => {
    setBoard(emptyBoard());
    setPiece(randomPiece());
    setNext(randomPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setOver(false);
    setPaused(false);
    startRef.current = Date.now();
    savedRef.current = false;
  };

  const tryMove = useCallback(
    (dr: number, dc: number, drot = 0) => {
      if (over || paused) return false;
      const np: Piece = { ...piece, r: piece.r + dr, c: piece.c + dc, rot: piece.rot + drot };
      if (!collides(board, np)) {
        setPiece(np);
        return true;
      }
      return false;
    },
    [board, piece, over, paused],
  );

  const lockAndNext = useCallback(() => {
    const merged = merge(board, piece);
    const { board: nb, cleared } = clearLines(merged);
    const points = [0, 40, 100, 300, 1200][cleared] * level;
    const newLines = lines + cleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    setBoard(nb);
    setScore((s) => s + points);
    setLines(newLines);
    setLevel(newLevel);
    const np = next;
    if (collides(nb, np)) {
      setOver(true);
      if (!savedRef.current && user) {
        savedRef.current = true;
        saveScore({
          gameSlug: "tetris",
          score: score + points,
          durationSeconds: Math.floor((Date.now() - startRef.current) / 1000),
          won: false,
          metadata: { lines: newLines, level: newLevel },
        }).catch(() => {});
      }
    } else {
      setPiece(np);
      setNext(randomPiece());
    }
  }, [board, piece, next, level, lines, score, user]);

  // Gravity
  useEffect(() => {
    if (over || paused) return;
    const speed = Math.max(80, 800 - (level - 1) * 60);
    const id = setInterval(() => {
      const np = { ...piece, r: piece.r + 1 };
      if (collides(board, np)) lockAndNext();
      else setPiece(np);
    }, speed);
    return () => clearInterval(id);
  }, [board, piece, level, over, paused, lockAndNext]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (over) return;
      if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (e.key === "ArrowLeft") tryMove(0, -1);
      else if (e.key === "ArrowRight") tryMove(0, 1);
      else if (e.key === "ArrowDown") tryMove(1, 0);
      else if (e.key === "ArrowUp") tryMove(0, 0, 1);
      else if (e.key === " ") {
        e.preventDefault();
        let np = { ...piece };
        while (!collides(board, { ...np, r: np.r + 1 })) np = { ...np, r: np.r + 1 };
        setPiece(np);
        setTimeout(lockAndNext, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove, piece, board, paused, over, lockAndNext]);

  // Render board with active piece overlay
  const display = board.map((row) => row.slice());
  const s = shape(piece);
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (s[r][c] && piece.r + r >= 0 && piece.r + r < ROWS) {
        display[piece.r + r][piece.c + c] = s[r][c];
      }
    }
  }

  const nextShape = shape(next);

  return (
    <GameShell
      title="Тетрис"
      category="Аркада"
      description="Класически Тетрис — подреждай фигурите, изчиствай редове и качвай нивата."
      sidebar={
        <>
          <div className="bg-surface-800 rounded-2xl p-5 border border-white/5 space-y-3">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Точки</p>
              <p className="text-3xl font-bold text-white font-mono">{score}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Редове</p>
                <p className="text-xl font-bold text-white font-mono">{lines}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Ниво</p>
                <p className="text-xl font-bold text-brand-secondary font-mono">{level}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-800 rounded-2xl p-5 border border-white/5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Следваща</p>
            <div className="inline-grid gap-[2px] p-2 bg-surface-900/60 rounded-lg" style={{ gridTemplateColumns: `repeat(${nextShape[0].length}, 1.25rem)` }}>
              {nextShape.flatMap((row, r) =>
                row.map((v, c) => (
                  <div key={`${r}-${c}`} className={`size-5 rounded-sm ${v ? COLORS[v] : "bg-transparent"}`} />
                )),
              )}
            </div>
          </div>

          <div className="bg-surface-800 rounded-2xl p-5 border border-white/5 space-y-2">
            <button
              onClick={() => setPaused((p) => !p)}
              className="w-full py-2 rounded-lg bg-surface-700 text-white font-semibold hover:bg-surface-700/70"
            >
              {paused ? "Продължи" : "Пауза"}
            </button>
            <button
              onClick={reset}
              className="w-full py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90"
            >
              Нова игра
            </button>
          </div>

          <div className="bg-surface-800 rounded-2xl p-5 border border-white/5 text-xs text-slate-400 space-y-1">
            <p>← → : движение</p>
            <p>↑ : завъртане</p>
            <p>↓ : ускоряване</p>
            <p>Space : drop</p>
            <p>P : пауза</p>
          </div>
        </>
      }
    >
      <div className="flex flex-col items-center gap-5">
        <div
          className="inline-grid gap-[2px] p-2 bg-surface-900/60 rounded-xl border border-white/5 relative"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1.5rem)` }}
        >
          {display.flatMap((row, r) =>
            row.map((v, c) => (
              <div key={`${r}-${c}`} className={`size-6 rounded-sm ${COLORS[v]}`} />
            )),
          )}
          {over && (
            <div className="absolute inset-0 bg-surface-900/80 rounded-xl flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-white mb-2">Край на играта</p>
              <p className="text-slate-300 mb-4">{score} точки, {lines} реда</p>
              <button onClick={reset} className="px-6 py-2 rounded-lg bg-brand-primary text-white font-semibold">
                Нова игра
              </button>
            </div>
          )}
          {paused && !over && (
            <div className="absolute inset-0 bg-surface-900/80 rounded-xl flex items-center justify-center">
              <p className="text-2xl font-bold text-white">Пауза</p>
            </div>
          )}
        </div>
        <TetrisPad
          onLeft={() => tryMove(0, -1)}
          onRight={() => tryMove(0, 1)}
          onDown={() => tryMove(1, 0)}
          onRotate={() => tryMove(0, 0, 1)}
          onDrop={() => {
            if (over || paused) return;
            let np = { ...piece };
            while (!collides(board, { ...np, r: np.r + 1 })) np = { ...np, r: np.r + 1 };
            setPiece(np);
            setTimeout(lockAndNext, 0);
          }}
        />
      </div>

    </GameShell>
  );
}
