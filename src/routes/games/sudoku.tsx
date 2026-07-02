import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/games/sudoku")({
  head: () => ({ meta: [{ title: "Судоку — IDMgames" }] }),
  component: SudokuGame,
});

type Board = number[][];
type Difficulty = "easy" | "medium" | "hard" | "expert";

const HOLES: Record<Difficulty, number> = {
  easy: 36,
  medium: 46,
  hard: 52,
  expert: 58,
};

const LABELS: Record<Difficulty, string> = {
  easy: "Лесно",
  medium: "Средно",
  hard: "Трудно",
  expert: "Експерт",
};

function emptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

function isValid(b: Board, row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (b[row][i] === num || b[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++) if (b[r][c] === num) return false;
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillBoard(b: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          if (isValid(b, r, c, n)) {
            b[r][c] = n;
            if (fillBoard(b)) return true;
            b[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generate(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = emptyBoard();
  fillBoard(solution);
  const puzzle = cloneBoard(solution);
  let holes = HOLES[difficulty];
  const cells = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number]),
  );
  for (const [r, c] of cells) {
    if (holes <= 0) break;
    puzzle[r][c] = 0;
    holes--;
  }
  return { puzzle, solution };
}

function SudokuGame() {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [{ puzzle, solution }, setGame] = useState(() => generate("easy"));
  const [board, setBoard] = useState<Board>(() => cloneBoard(puzzle));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState(false);
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);

  const reset = useCallback((d: Difficulty) => {
    const g = generate(d);
    setGame(g);
    setBoard(cloneBoard(g.puzzle));
    setSelected(null);
    setMistakes(0);
    setWon(false);
    startRef.current = Date.now();
    savedRef.current = false;
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (won) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [won]);

  const setCell = useCallback(
    (num: number) => {
      if (!selected || won) return;
      const [r, c] = selected;
      if (puzzle[r][c] !== 0) return;
      const nb = cloneBoard(board);
      nb[r][c] = num;
      setBoard(nb);
      if (num !== 0 && solution[r][c] !== num) setMistakes((m) => m + 1);
      if (nb.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) {
        setWon(true);
      }
    },
    [selected, board, puzzle, solution, won],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "9") setCell(Number(e.key));
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") setCell(0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCell]);

  useEffect(() => {
    if (won && !savedRef.current && user) {
      savedRef.current = true;
      const score = Math.max(0, 5000 - elapsed * 5 - mistakes * 100);
      saveScore({
        gameSlug: "sudoku",
        score,
        durationSeconds: elapsed,
        won: true,
        metadata: { difficulty, mistakes },
      }).catch(console.error);
    }
  }, [won, user, elapsed, mistakes, difficulty]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const conflicts = useMemo(() => {
    const s = new Set<string>();
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const v = board[r][c];
        if (v !== 0 && v !== solution[r][c]) s.add(`${r},${c}`);
      }
    return s;
  }, [board, solution]);

  return (
    <GameShell
      title="Судоку"
      category="Логика"
      description="Попълни решетката така, че всеки ред, колона и 3×3 квадрат да съдържат числата 1-9."
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Трудност</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LABELS) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    reset(d);
                  }}
                  className={`px-2 py-2 text-xs font-bold rounded-md transition-colors ${
                    difficulty === d
                      ? "bg-brand-primary text-white"
                      : "bg-surface-700 text-slate-300 hover:bg-surface-700/70"
                  }`}
                >
                  {LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Време</p>
              <p className="text-2xl font-bold text-white font-mono">{mm}:{ss}</p>
            </div>
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Грешки</p>
              <p className="text-2xl font-bold text-brand-secondary font-mono">{mistakes}</p>
            </div>
          </div>
          <button
            onClick={() => reset(difficulty)}
            className="w-full py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
          >
            Нова игра
          </button>
          {!user && (
            <div className="bg-surface-800 border border-brand-primary/30 rounded-xl p-5 text-sm text-slate-300">
              <a href="/auth" className="text-brand-primary font-semibold hover:underline">Влез</a>, за да пазиш резултатите си.
            </div>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-5">
        <div className="grid grid-cols-9 bg-surface-900 border-2 border-white/20 rounded-lg overflow-hidden">
          {board.map((row, r) =>
            row.map((v, c) => {
              const isFixed = puzzle[r][c] !== 0;
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const sameRow = selected?.[0] === r;
              const sameCol = selected?.[1] === c;
              const sameBox =
                selected &&
                Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
                Math.floor(selected[1] / 3) === Math.floor(c / 3);
              const highlight = sameRow || sameCol || sameBox;
              const isConflict = conflicts.has(`${r},${c}`);
              const borderR = (c + 1) % 3 === 0 && c !== 8 ? "border-r-2 border-r-white/20" : "border-r border-r-white/5";
              const borderB = (r + 1) % 3 === 0 && r !== 8 ? "border-b-2 border-b-white/20" : "border-b border-b-white/5";
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => setSelected([r, c])}
                  className={`size-9 sm:size-11 flex items-center justify-center text-lg sm:text-xl font-bold ${borderR} ${borderB} transition-colors ${
                    isSel
                      ? "bg-brand-primary/40"
                      : highlight
                      ? "bg-surface-700/60"
                      : "bg-surface-800"
                  } ${
                    isFixed
                      ? "text-white"
                      : isConflict
                      ? "text-red-400"
                      : "text-brand-secondary"
                  }`}
                >
                  {v || ""}
                </button>
              );
            }),
          )}
        </div>

        <div className="grid grid-cols-9 gap-1.5 w-full max-w-md">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => setCell(n)}
              className="aspect-square bg-surface-700 hover:bg-brand-primary text-white text-lg font-bold rounded-md transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCell(0)}
          className="text-xs text-slate-400 hover:text-white"
        >
          Изчисти клетка (Backspace)
        </button>

        {won && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white mb-1">Победа! 🎉</p>
            <p className="text-slate-300 text-sm">
              Време: <span className="font-mono text-emerald-400">{mm}:{ss}</span> · Грешки:{" "}
              <span className="font-mono text-emerald-400">{mistakes}</span>
            </p>
          </div>
        )}
      </div>
    </GameShell>
  );
}
