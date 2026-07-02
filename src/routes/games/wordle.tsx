import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";
import { WORDS_5, CYRILLIC_LETTERS } from "@/lib/bg-words";

export const Route = createFileRoute("/games/wordle")({
  head: () => ({ meta: [{ title: "Познай думата — IDMgames" }] }),
  component: WordleGame,
});

const MAX_TRIES = 6;
const WORD_LEN = 5;

type LetterState = "correct" | "present" | "absent" | "empty";

function evaluate(guess: string, answer: string): LetterState[] {
  const res: LetterState[] = Array(WORD_LEN).fill("absent");
  const used = Array(WORD_LEN).fill(false);
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === answer[i]) {
      res[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (res[i] === "correct") continue;
    for (let j = 0; j < WORD_LEN; j++) {
      if (!used[j] && guess[i] === answer[j]) {
        res[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return res;
}

function WordleGame() {
  const { user } = useAuth();
  const [answer, setAnswer] = useState<string>(() => WORDS_5[Math.floor(Math.random() * WORDS_5.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [flash, setFlash] = useState<string | null>(null);
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);

  const reset = useCallback(() => {
    setAnswer(WORDS_5[Math.floor(Math.random() * WORDS_5.length)]);
    setGuesses([]);
    setCurrent("");
    setStatus("playing");
    startRef.current = Date.now();
    savedRef.current = false;
  }, []);

  const submit = useCallback(() => {
    if (status !== "playing") return;
    if (current.length !== WORD_LEN) {
      setFlash("Думата трябва да е с 5 букви");
      setTimeout(() => setFlash(null), 1500);
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");
    if (current === answer) setStatus("won");
    else if (next.length >= MAX_TRIES) setStatus("lost");
  }, [current, guesses, status, answer]);

  const type = useCallback(
    (l: string) => {
      if (status !== "playing") return;
      if (current.length >= WORD_LEN) return;
      setCurrent((c) => c + l);
    },
    [current, status],
  );

  const back = useCallback(() => setCurrent((c) => c.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") submit();
      else if (e.key === "Backspace") back();
      else {
        const u = e.key.toUpperCase();
        if (CYRILLIC_LETTERS.includes(u)) type(u);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, back, type]);

  useEffect(() => {
    if (status === "playing" || savedRef.current || !user) return;
    savedRef.current = true;
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    const won = status === "won";
    const score = won ? Math.max(0, (MAX_TRIES - guesses.length + 1) * 200 - elapsed) : 0;
    saveScore({
      gameSlug: "wordle",
      score,
      durationSeconds: elapsed,
      won,
      metadata: { tries: guesses.length, answer },
    }).catch(console.error);
  }, [status, user, guesses.length, answer]);

  const letterStates = useMemo(() => {
    const map: Record<string, LetterState> = {};
    for (const g of guesses) {
      const s = evaluate(g, answer);
      for (let i = 0; i < WORD_LEN; i++) {
        const l = g[i];
        const prev = map[l];
        const nxt = s[i];
        if (prev === "correct") continue;
        if (prev === "present" && nxt === "absent") continue;
        map[l] = nxt;
      }
    }
    return map;
  }, [guesses, answer]);

  const rows = Array.from({ length: MAX_TRIES }, (_, r) => {
    if (r < guesses.length) {
      const g = guesses[r];
      const s = evaluate(g, answer);
      return { letters: g.split(""), states: s };
    }
    if (r === guesses.length) {
      const letters = current.padEnd(WORD_LEN, " ").split("");
      return { letters, states: Array<LetterState>(WORD_LEN).fill("empty") };
    }
    return { letters: Array(WORD_LEN).fill(" "), states: Array<LetterState>(WORD_LEN).fill("empty") };
  });

  const kbRows = ["ЯВЕРТЪУИОПШ", "АСДФГХЙКЛЮЩ", "ЗЬЦЖБНМЧЪ"];

  const stateClass = (s: LetterState) =>
    s === "correct"
      ? "bg-emerald-500 border-emerald-500 text-white"
      : s === "present"
        ? "bg-amber-500 border-amber-500 text-white"
        : s === "absent"
          ? "bg-surface-700 border-surface-700 text-slate-400"
          : "border-white/10 text-white";

  return (
    <GameShell
      title="Познай думата"
      category="Думи"
      description="Познай тайната 5-буквена дума за 6 опита. Цветовете подсказват колко близо си."
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-sm text-slate-300 space-y-2">
            <p><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 mr-2 align-middle" />Точна буква на точното място</p>
            <p><span className="inline-block w-3 h-3 rounded-sm bg-amber-500 mr-2 align-middle" />Буквата е в думата, но не там</p>
            <p><span className="inline-block w-3 h-3 rounded-sm bg-surface-700 border border-white/10 mr-2 align-middle" />Буквата не е в думата</p>
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
      <div className="flex flex-col items-center gap-5">
        <div className="grid gap-1.5">
          {rows.map((row, r) => (
            <div key={r} className="grid grid-cols-5 gap-1.5">
              {row.letters.map((l, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 sm:w-14 sm:h-14 border-2 rounded-md flex items-center justify-center text-xl sm:text-2xl font-bold uppercase ${stateClass(row.states[i])}`}
                >
                  {l.trim()}
                </div>
              ))}
            </div>
          ))}
        </div>

        {flash && <p className="text-sm text-amber-400">{flash}</p>}

        {status === "won" && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white mb-1">Позна! 🎉</p>
            <p className="text-slate-300 text-sm">Думата: <span className="font-mono text-emerald-400">{answer}</span></p>
          </div>
        )}
        {status === "lost" && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white mb-1">Опитите свършиха</p>
            <p className="text-slate-300 text-sm">Думата беше: <span className="font-mono text-red-400">{answer}</span></p>
          </div>
        )}

        <div className="w-full max-w-xl space-y-1.5">
          {kbRows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1">
              {ri === 2 && (
                <button
                  onClick={submit}
                  className="px-2 sm:px-3 h-11 text-xs sm:text-sm font-bold rounded bg-brand-primary text-white hover:bg-brand-primary/90"
                >
                  ENTER
                </button>
              )}
              {row.split("").map((l) => (
                <button
                  key={l}
                  onClick={() => type(l)}
                  className={`w-7 sm:w-9 h-11 rounded font-bold text-sm ${stateClass(letterStates[l] ?? "empty")} hover:opacity-90`}
                >
                  {l}
                </button>
              ))}
              {ri === 2 && (
                <button
                  onClick={back}
                  className="px-2 sm:px-3 h-11 text-xs font-bold rounded bg-surface-700 text-white hover:bg-surface-700/70"
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
