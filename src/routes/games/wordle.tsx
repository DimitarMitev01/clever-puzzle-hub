import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { saveScore } from "@/lib/save-score";
import { useAuth } from "@/hooks/use-auth";
import { CYRILLIC_LETTERS, LATIN_LETTERS } from "@/lib/bg-words";
import { WORDLE_BG } from "@/lib/wordle-bg";
import { WORDLE_EN } from "@/lib/wordle-en";
const WORDS_5 = WORDLE_BG;
const WORDS_5_EN = WORDLE_EN;

export const Route = createFileRoute("/games/wordle")({
  head: () => ({ meta: [{ title: "Познай думата — IDMgames" }] }),
  component: WordleGame,
});

const MAX_TRIES = 6;
const WORD_LEN = 5;

type LetterState = "correct" | "present" | "absent" | "empty";
type Lang = "bg" | "en";

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
  const [lang, setLang] = useState<Lang>("bg");
  const dict = useMemo(() => (lang === "bg" ? WORDS_5 : WORDS_5_EN), [lang]);
  const dictSet = useMemo(() => new Set(dict), [dict]);
  const letters = lang === "bg" ? CYRILLIC_LETTERS : LATIN_LETTERS;

  const [answer, setAnswer] = useState<string>(() => WORDS_5[Math.floor(Math.random() * WORDS_5.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [flash, setFlash] = useState<string | null>(null);
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);

  const reset = useCallback(
    (nextLang?: Lang) => {
      const l = nextLang ?? lang;
      const list = l === "bg" ? WORDS_5 : WORDS_5_EN;
      setAnswer(list[Math.floor(Math.random() * list.length)]);
      setGuesses([]);
      setCurrent("");
      setStatus("playing");
      startRef.current = Date.now();
      savedRef.current = false;
    },
    [lang],
  );

  const switchLang = useCallback(
    (l: Lang) => {
      if (l === lang) return;
      setLang(l);
      reset(l);
    },
    [lang, reset],
  );

  const flashMsg = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(null), 1500);
  };

  const submit = useCallback(() => {
    if (status !== "playing") return;
    if (current.length !== WORD_LEN) {
      flashMsg(lang === "bg" ? "Думата трябва да е с 5 букви" : "Word must be 5 letters");
      return;
    }
    if (!dictSet.has(current)) {
      flashMsg(lang === "bg" ? "Няма такава дума в речника" : "Not in word list");
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");
    if (current === answer) setStatus("won");
    else if (next.length >= MAX_TRIES) setStatus("lost");
  }, [current, guesses, status, answer, dictSet, lang]);

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
        if (letters.includes(u)) type(u);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, back, type, letters]);

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
      metadata: { tries: guesses.length, answer, lang },
    }).catch(console.error);
  }, [status, user, guesses.length, answer, lang]);

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
      const l = current.padEnd(WORD_LEN, " ").split("");
      return { letters: l, states: Array<LetterState>(WORD_LEN).fill("empty") };
    }
    return { letters: Array(WORD_LEN).fill(" "), states: Array<LetterState>(WORD_LEN).fill("empty") };
  });

  const kbRows =
    lang === "bg"
      ? ["ЯВЕРТЪУИОПШ", "АСДФГХЙКЛЮЩ", "ЗЬЦЖБНМЧЪ"]
      : ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

  const stateClass = (s: LetterState) =>
    s === "correct"
      ? "bg-emerald-500 border-emerald-500 text-white"
      : s === "present"
        ? "bg-amber-500 border-amber-500 text-white"
        : s === "absent"
          ? "bg-surface-700 border-surface-700 text-slate-400"
          : "border-white/10 text-white";

  const t = (bg: string, en: string) => (lang === "bg" ? bg : en);

  return (
    <GameShell
      title={t("Познай думата", "Guess the Word")}
      category={t("Думи", "Words")}
      description={t(
        "Познай тайната 5-буквена дума за 6 опита. Цветовете подсказват колко близо си.",
        "Guess the secret 5-letter word in 6 tries. Colors hint how close you are.",
      )}
      sidebar={
        <>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-1 grid grid-cols-2 gap-1">
            <button
              onClick={() => switchLang("bg")}
              className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                lang === "bg" ? "bg-brand-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              БГ
            </button>
            <button
              onClick={() => switchLang("en")}
              className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                lang === "en" ? "bg-brand-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-sm text-slate-300 space-y-2">
            <p><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 mr-2 align-middle" />{t("Точна буква на точното място", "Right letter, right spot")}</p>
            <p><span className="inline-block w-3 h-3 rounded-sm bg-amber-500 mr-2 align-middle" />{t("Буквата е в думата, но не там", "In the word, wrong spot")}</p>
            <p><span className="inline-block w-3 h-3 rounded-sm bg-surface-700 border border-white/10 mr-2 align-middle" />{t("Буквата не е в думата", "Not in the word")}</p>
          </div>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
          >
            {t("Нова дума", "New word")}
          </button>
          {!user && (
            <div className="bg-surface-800 border border-brand-primary/30 rounded-xl p-5 text-sm text-slate-300">
              <a href="/auth" className="text-brand-primary font-semibold hover:underline">{t("Влез", "Sign in")}</a>
              {t(", за да пазиш резултатите си.", " to save your scores.")}
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
            <p className="text-2xl font-bold text-white mb-1">{t("Позна! 🎉", "You got it! 🎉")}</p>
            <p className="text-slate-300 text-sm">{t("Думата:", "Word:")} <span className="font-mono text-emerald-400">{answer}</span></p>
          </div>
        )}
        {status === "lost" && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white mb-1">{t("Опитите свършиха", "Out of tries")}</p>
            <p className="text-slate-300 text-sm">{t("Думата беше:", "The word was:")} <span className="font-mono text-red-400">{answer}</span></p>
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
