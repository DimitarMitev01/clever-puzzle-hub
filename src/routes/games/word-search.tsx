import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";
import { CYRILLIC_LETTERS } from "@/lib/bg-words";

export const Route = createFileRoute("/games/word-search")({
  head: () => ({ meta: [{ title: "Намери думата — IDMgames" }] }),
  component: WordSearchGame,
});

const WORD_POOL = [
  "СОФИЯ", "ПЛОВДИВ", "ВАРНА", "БУРГАС", "РУСЕ", "СТАРА", "ПЛЕВЕН",
  "КНИГА", "МУЗИКА", "СПОРТ", "МОРЕ", "ГОРА", "ПЛАНИНА", "РЕКА",
  "ЛЪВ", "СЛОН", "ТИГЪР", "МЕЧКА", "ВЪЛК", "ЛИСИЦА", "КОТКА", "КУЧЕ",
  "ЯБЪЛКА", "БАНАН", "ПОРТОКАЛ", "ЛИМОН", "ЧЕРЕША", "ЯГОДА",
];

const GRID = 12;
const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1],
];

type Placed = { word: string; cells: [number, number][]; found: boolean };

function buildBoard(): { grid: string[][]; placed: Placed[] } {
  const grid: string[][] = Array.from({ length: GRID }, () => Array(GRID).fill(""));
  const placed: Placed[] = [];
  const pool = [...WORD_POOL].sort(() => Math.random() - 0.5).slice(0, 10);

  for (const word of pool) {
    let ok = false;
    for (let tries = 0; tries < 100 && !ok; tries++) {
      const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const r0 = Math.floor(Math.random() * GRID);
      const c0 = Math.floor(Math.random() * GRID);
      const cells: [number, number][] = [];
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        if (r < 0 || r >= GRID || c < 0 || c >= GRID) { fits = false; break; }
        if (grid[r][c] && grid[r][c] !== word[i]) { fits = false; break; }
        cells.push([r, c]);
      }
      if (!fits) continue;
      for (let i = 0; i < word.length; i++) {
        grid[cells[i][0]][cells[i][1]] = word[i];
      }
      placed.push({ word, cells, found: false });
      ok = true;
    }
  }
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (!grid[r][c]) grid[r][c] = CYRILLIC_LETTERS[Math.floor(Math.random() * CYRILLIC_LETTERS.length)];
    }
  }
  return { grid, placed };
}

function cellsBetween(a: [number, number], b: [number, number]): [number, number][] | null {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  if (dr === 0 && dc === 0) return null;
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  if (dr !== 0 && Math.abs(dr) !== len) return null;
  if (dc !== 0 && Math.abs(dc) !== len) return null;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const cells: [number, number][] = [];
  for (let i = 0; i <= len; i++) cells.push([a[0] + sr * i, a[1] + sc * i]);
  return cells;
}

function sameCells(a: [number, number][], b: [number, number][]) {
  if (a.length !== b.length) return false;
  const key = (c: [number, number]) => `${c[0]},${c[1]}`;
  const sa = new Set(a.map(key));
  return b.every((c) => sa.has(key(c)));
}

function WordSearchGame() {
  const { user } = useAuth();
  const [{ grid, placed }, setBoard] = useState(buildBoard);
  const [selecting, setSelecting] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const savedRef = useRef(false);
  const won = foundWords.length === placed.length;

  useEffect(() => {
    if (won) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [won]);

  const reset = useCallback(() => {
    setBoard(buildBoard());
    setSelecting(null);
    setHover(null);
    setFoundWords([]);
    setFoundCells(new Set());
    startRef.current = Date.now();
    setElapsed(0);
    savedRef.current = false;
  }, []);

  useEffect(() => {
    if (won && !savedRef.current && user) {
      savedRef.current = true;
      const score = Math.max(0, 5000 - elapsed * 10);
      saveScore({
        gameSlug: "word-search",
        score,
        durationSeconds: elapsed,
        won: true,
        metadata: { words: placed.length },
      }).catch(console.error);
    }
  }, [won, user, elapsed, placed.length]);

  const preview = useMemo(() => {
    if (!selecting || !hover) return null;
    return cellsBetween(selecting, hover);
  }, [selecting, hover]);

  const onCellDown = (r: number, c: number) => {
    setSelecting([r, c]);
    setHover([r, c]);
  };
  const onCellEnter = (r: number, c: number) => {
    if (selecting) setHover([r, c]);
  };
  const onCellUp = () => {
    if (!selecting || !hover) return;
    const line = cellsBetween(selecting, hover);
    setSelecting(null);
    setHover(null);
    if (!line) return;
    const match = placed.find((p) => !p.found && sameCells(p.cells, line));
    if (match) {
      match.found = true;
      setFoundWords((w) => [...w, match.word]);
      setFoundCells((s) => {
        const n = new Set(s);
        for (const [r, c] of match.cells) n.add(`${r},${c}`);
        return n;
      });
    }
  };

  const previewSet = new Set((preview ?? []).map(([r, c]) => `${r},${c}`));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <GameShell
      title="Намери думата"
      category="Думи"
      description="Намери всички скрити думи. Влачи от първата до последната буква — думите могат да са във всяка посока."
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Време</p>
            <p className="text-2xl font-bold text-brand-secondary font-mono">{mm}:{ss}</p>
          </div>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">
              Думи {foundWords.length}/{placed.length}
            </p>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {placed.map((p) => (
                <span
                  key={p.word}
                  className={`font-mono ${foundWords.includes(p.word) ? "line-through text-emerald-400" : "text-slate-300"}`}
                >
                  {p.word}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={reset}
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
      <div className="flex flex-col items-center gap-5" onMouseUp={onCellUp} onMouseLeave={() => { setSelecting(null); setHover(null); }}>
        <div
          className="grid gap-0.5 select-none touch-none"
          style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) =>
            row.map((ch, c) => {
              const key = `${r},${c}`;
              const inPreview = previewSet.has(key);
              const isFound = foundCells.has(key);
              return (
                <button
                  key={key}
                  onMouseDown={() => onCellDown(r, c)}
                  onMouseEnter={() => onCellEnter(r, c)}
                  className={`w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-xs sm:text-sm font-bold rounded transition-colors ${
                    isFound
                      ? "bg-emerald-500/30 text-emerald-200"
                      : inPreview
                        ? "bg-brand-primary/40 text-white"
                        : "bg-surface-700 text-slate-200 hover:bg-surface-700/70"
                  }`}
                >
                  {ch}
                </button>
              );
            }),
          )}
        </div>

        {won && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white mb-1">Всички думи намерени! 🎉</p>
            <p className="text-slate-300 text-sm">Време: <span className="font-mono text-emerald-400">{mm}:{ss}</span></p>
          </div>
        )}
      </div>
    </GameShell>
  );
}
