import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";
import { HANGMAN_WORDS, CYRILLIC_LETTERS } from "@/lib/bg-words";

export const Route = createFileRoute("/games/hangman")({
  head: () => ({ meta: [{ title: "Бесеница — IDMgames" }] }),
  component: HangmanGame,
});

const MAX_WRONG = 7;

function pick(): string {
  return HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
}

function HangmanGame() {
  const { user } = useAuth();
  const [word, setWord] = useState<string>(pick);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);

  const wrong = [...guessed].filter((l) => !word.includes(l)).length;
  const won = word.split("").every((l) => guessed.has(l));
  const lost = wrong >= MAX_WRONG;
  const over = won || lost;

  const reset = useCallback(() => {
    setWord(pick());
    setGuessed(new Set());
    startRef.current = Date.now();
    savedRef.current = false;
  }, []);

  const guess = useCallback(
    (l: string) => {
      if (over || guessed.has(l)) return;
      setGuessed((g) => new Set(g).add(l));
    },
    [guessed, over],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const u = e.key.toUpperCase();
      if (CYRILLIC_LETTERS.includes(u)) guess(u);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guess]);

  useEffect(() => {
    if (!over || savedRef.current || !user) return;
    savedRef.current = true;
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    const score = won ? Math.max(0, (MAX_WRONG - wrong) * 150 + word.length * 20 - elapsed) : 0;
    saveScore({
      gameSlug: "hangman",
      score,
      durationSeconds: elapsed,
      won,
      metadata: { word, wrong },
    }).catch(console.error);
  }, [over, user, won, wrong, word]);

  const remaining = MAX_WRONG - wrong;
  const parts = ["cross", "head", "body", "arm1", "arm2", "leg1", "leg2"]; // 7 parts
  const visible = parts.slice(0, wrong);

  return (
    <GameShell
      title="Бесеница"
      category="Думи"
      description="Познай думата буква по буква. Имаш 7 грешки — не бързай."
      sidebar={
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Останали</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{remaining}</p>
            </div>
            <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Грешки</p>
              <p className="text-2xl font-bold text-red-400 font-mono">{wrong}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
          >
            Нова дума
          </button>
          {!user && (
            <div className="bg-surface-800 border border-brand-primary/30 rounded-xl p-5 text-sm text-slate-300">
              <a href="/auth" className="text-brand-primary font-semibold hover:underline">Влез</a>, за да пазиш резултатите си.
            </div>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-6">
        <svg viewBox="0 0 200 200" className="w-56 h-56 stroke-slate-300" strokeWidth={4} fill="none" strokeLinecap="round">
          {/* gallows */}
          <line x1="20" y1="190" x2="180" y2="190" />
          <line x1="50" y1="190" x2="50" y2="20" />
          <line x1="50" y1="20" x2="130" y2="20" />
          <line x1="130" y1="20" x2="130" y2="45" />
          {visible.includes("cross") && <line x1="50" y1="50" x2="90" y2="20" className="stroke-red-400" />}
          {visible.includes("head") && <circle cx="130" cy="60" r="15" className="stroke-red-400" />}
          {visible.includes("body") && <line x1="130" y1="75" x2="130" y2="130" className="stroke-red-400" />}
          {visible.includes("arm1") && <line x1="130" y1="90" x2="110" y2="110" className="stroke-red-400" />}
          {visible.includes("arm2") && <line x1="130" y1="90" x2="150" y2="110" className="stroke-red-400" />}
          {visible.includes("leg1") && <line x1="130" y1="130" x2="110" y2="160" className="stroke-red-400" />}
          {visible.includes("leg2") && <line x1="130" y1="130" x2="150" y2="160" className="stroke-red-400" />}
        </svg>

        <div className="flex flex-wrap justify-center gap-2">
          {word.split("").map((l, i) => (
            <div
              key={i}
              className="w-9 h-11 border-b-2 border-white/30 flex items-center justify-center text-2xl font-bold text-white"
            >
              {guessed.has(l) || lost ? l : ""}
            </div>
          ))}
        </div>

        {won && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white">Позна! 🎉</p>
          </div>
        )}
        {lost && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white mb-1">Загуба</p>
            <p className="text-slate-300 text-sm">Думата беше: <span className="font-mono text-red-400">{word}</span></p>
          </div>
        )}

        <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 w-full max-w-xl">
          {CYRILLIC_LETTERS.map((l) => {
            const used = guessed.has(l);
            const hit = used && word.includes(l);
            const miss = used && !word.includes(l);
            return (
              <button
                key={l}
                onClick={() => guess(l)}
                disabled={used || over}
                className={`h-10 rounded font-bold text-sm transition-colors ${
                  hit
                    ? "bg-emerald-500 text-white"
                    : miss
                      ? "bg-red-500/40 text-slate-400"
                      : "bg-surface-700 text-white hover:bg-brand-primary"
                } disabled:cursor-not-allowed`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
