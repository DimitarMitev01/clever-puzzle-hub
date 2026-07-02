import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/games/tic-tac-toe")({
  head: () => ({ meta: [{ title: "Tic-Tac-Toe — IDMgames" }] }),
  component: TicTacToe,
});

type Cell = "X" | "O" | null;
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(board: Cell[]): { winner: Cell; line: number[] | null } {
  for (const l of LINES) {
    const [a, b, c] = l;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: l };
    }
  }
  return { winner: null, line: null };
}

function bestMove(board: Cell[], me: "X" | "O"): number {
  const opp = me === "X" ? "O" : "X";
  const minimax = (b: Cell[], player: "X" | "O"): { score: number; move: number } => {
    const { winner } = winnerOf(b);
    if (winner === me) return { score: 10, move: -1 };
    if (winner === opp) return { score: -10, move: -1 };
    if (b.every(Boolean)) return { score: 0, move: -1 };
    const moves: { score: number; move: number }[] = [];
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const nb = b.slice();
        nb[i] = player;
        const r = minimax(nb, player === "X" ? "O" : "X");
        moves.push({ score: r.score, move: i });
      }
    }
    if (player === me) return moves.reduce((a, b) => (a.score > b.score ? a : b));
    return moves.reduce((a, b) => (a.score < b.score ? a : b));
  };
  return minimax(board, me).move;
}

function TicTacToe() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"ai" | "pvp">("ai");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [xNext, setXNext] = useState(true);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [wins, setWins] = useState({ X: 0, O: 0, draw: 0 });

  const { winner, line } = useMemo(() => winnerOf(board), [board]);
  const isDraw = !winner && board.every(Boolean);
  const gameOver = !!winner || isDraw;

  function reset() {
    setBoard(Array(9).fill(null));
    setXNext(true);
    setStartedAt(Date.now());
  }

  async function finish(w: Cell) {
    const duration = Math.round((Date.now() - startedAt) / 1000);
    setWins((prev) => ({
      X: prev.X + (w === "X" ? 1 : 0),
      O: prev.O + (w === "O" ? 1 : 0),
      draw: prev.draw + (w === null ? 1 : 0),
    }));
    if (user) {
      try {
        await saveScore({
          gameSlug: "tic-tac-toe",
          score: w === "X" ? 1 : 0,
          durationSeconds: duration,
          won: mode === "ai" ? w === "X" : !!w,
          metadata: { mode, result: w ?? "draw" },
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  function play(i: number) {
    if (board[i] || gameOver) return;
    const nb = board.slice();
    nb[i] = xNext ? "X" : "O";
    setBoard(nb);
    const w = winnerOf(nb).winner;
    if (w || nb.every(Boolean)) {
      finish(w);
      return;
    }
    if (mode === "ai") {
      const ai = bestMove(nb, "O");
      if (ai >= 0) {
        setTimeout(() => {
          setBoard((cur) => {
            if (cur[ai] || winnerOf(cur).winner) return cur;
            const nnb = cur.slice();
            nnb[ai] = "O";
            const w2 = winnerOf(nnb).winner;
            if (w2 || nnb.every(Boolean)) finish(w2);
            return nnb;
          });
        }, 250);
      }
    } else {
      setXNext(!xNext);
    }
  }

  const status = winner
    ? `Победа за ${winner}!`
    : isDraw
    ? "Равенство"
    : mode === "ai"
    ? xNext
      ? "Твой ход (X)"
      : "Компютърът мисли..."
    : `Ход на ${xNext ? "X" : "O"}`;

  return (
    <GameShell
      title="Tic-Tac-Toe"
      category="Стратегия"
      description="Морски шах срещу компютър или приятел на едно устройство."
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Режим</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("ai"); reset(); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${mode === "ai" ? "bg-brand-primary text-white" : "bg-surface-700 text-slate-300"}`}
              >
                Срещу AI
              </button>
              <button
                onClick={() => { setMode("pvp"); reset(); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${mode === "pvp" ? "bg-brand-primary text-white" : "bg-surface-700 text-slate-300"}`}
              >
                2 играча
              </button>
            </div>
          </div>

          <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Резултат</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-2xl font-bold text-white">{wins.X}</p><p className="text-[10px] text-slate-500 uppercase">X</p></div>
              <div><p className="text-2xl font-bold text-white">{wins.draw}</p><p className="text-[10px] text-slate-500 uppercase">Равно</p></div>
              <div><p className="text-2xl font-bold text-white">{wins.O}</p><p className="text-[10px] text-slate-500 uppercase">O</p></div>
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
      <div className="flex flex-col items-center gap-6">
        <p className="text-lg text-slate-300">{status}</p>
        <div className="grid grid-cols-3 gap-3">
          {board.map((cell, i) => {
            const inLine = line?.includes(i);
            return (
              <button
                key={i}
                onClick={() => play(i)}
                disabled={!!cell || gameOver || (mode === "ai" && !xNext)}
                className={`size-24 sm:size-28 rounded-xl border text-5xl font-black transition-all
                  ${inLine ? "bg-brand-primary/30 border-brand-primary text-white" : "bg-surface-900 border-white/10 hover:border-brand-primary/50"}
                  ${cell === "X" ? "text-brand-primary" : ""}
                  ${cell === "O" ? "text-brand-secondary" : ""}
                  disabled:cursor-not-allowed`}
              >
                {cell}
              </button>
            );
          })}
        </div>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
        >
          Нова игра
        </button>
      </div>
    </GameShell>
  );
}
