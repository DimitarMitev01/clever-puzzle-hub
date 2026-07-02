import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/games/memory")({
  head: () => ({ meta: [{ title: "Memory — IDMgames" }] }),
  component: MemoryGame,
});

type Size = "4x4" | "6x6";
const SIZES: Record<Size, { cols: number; pairs: number }> = {
  "4x4": { cols: 4, pairs: 8 },
  "6x6": { cols: 6, pairs: 18 },
};

const EMOJIS = ["🎮", "🎲", "🎯", "🎪", "🎨", "🎭", "🎸", "🎺", "🎻", "🎹", "🎤", "🎧", "🎬", "🏆", "⚡", "🔥", "💎", "🌟", "🚀", "🌈"];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Card = { id: number; value: string; matched: boolean; flipped: boolean };

function makeDeck(size: Size): Card[] {
  const { pairs } = SIZES[size];
  const values = shuffle(EMOJIS).slice(0, pairs);
  const deck = shuffle([...values, ...values]).map((v, i) => ({
    id: i,
    value: v,
    matched: false,
    flipped: false,
  }));
  return deck;
}

function MemoryGame() {
  const { user } = useAuth();
  const [size, setSize] = useState<Size>("4x4");
  const [cards, setCards] = useState<Card[]>(() => makeDeck("4x4"));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);

  const reset = useCallback((s: Size) => {
    setCards(makeDeck(s));
    setFlipped([]);
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

  const flip = useCallback(
    (id: number) => {
      if (won) return;
      if (flipped.length === 2) return;
      const c = cards.find((c) => c.id === id);
      if (!c || c.matched || c.flipped) return;
      const nc = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
      const nf = [...flipped, id];
      setCards(nc);
      setFlipped(nf);
      if (nf.length === 2) {
        setMoves((m) => m + 1);
        const [a, b] = nf.map((i) => nc.find((c) => c.id === i)!);
        if (a.value === b.value) {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c)),
            );
            setFlipped([]);
          }, 400);
        } else {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) => (c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c)),
            );
            setFlipped([]);
          }, 900);
        }
      }
    },
    [cards, flipped, won],
  );

  useEffect(() => {
    if (cards.length > 0 && cards.every((c) => c.matched) && !won) {
      setWon(true);
    }
  }, [cards, won]);

  useEffect(() => {
    if (won && !savedRef.current && user) {
      savedRef.current = true;
      const score = Math.max(0, 3000 - elapsed * 5 - moves * 10);
      saveScore({
        gameSlug: "memory",
        score,
        durationSeconds: elapsed,
        won: true,
        metadata: { size, moves },
      }).catch(console.error);
    }
  }, [won, user, elapsed, moves, size]);

  const { cols } = SIZES[size];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <GameShell
      title="Memory"
      category="Памет"
      description="Открий всички двойки еднакви карти с колкото се може по-малко ходове."
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Размер</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SIZES) as Size[]).map((s) => (
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
                  {s}
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
        <div
          className="grid gap-2 sm:gap-3 w-full max-w-lg"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cards.map((c) => {
            const show = c.flipped || c.matched;
            return (
              <button
                key={c.id}
                onClick={() => flip(c.id)}
                className={`aspect-square rounded-lg flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 ${
                  show
                    ? c.matched
                      ? "bg-emerald-500/20 border border-emerald-400/40"
                      : "bg-brand-primary/30 border border-brand-primary/50"
                    : "bg-surface-700 hover:bg-surface-700/70 border border-white/5"
                }`}
              >
                {show ? c.value : ""}
              </button>
            );
          })}
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
