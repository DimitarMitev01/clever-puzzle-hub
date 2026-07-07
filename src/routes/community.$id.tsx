import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getApprovedCommunityGame } from "@/lib/community.functions";
import { layoutCrossword, type Layout } from "@/lib/crossword-layout";
import { ArrowLeft, CheckCircle2, XCircle, HelpCircle, Puzzle, Calculator, Sparkles, RotateCcw, Eye } from "lucide-react";

export const Route = createFileRoute("/community/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Игра от общността — IDMgames" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayCommunityGame,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        <Link
          to="/community"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="size-4" />
          Обратно към общността
        </Link>
        {children}
      </main>
      <Footer />
    </div>
  );
}

function PlayCommunityGame() {
  const { id } = Route.useParams();
  const fn = useServerFn(getApprovedCommunityGame);
  const q = useQuery({
    queryKey: ["community-game", id],
    queryFn: () => fn({ data: { id } }),
  });

  if (q.isLoading) {
    return (
      <Shell>
        <p className="text-slate-500">Зареждане...</p>
      </Shell>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Shell>
        <div className="bg-surface-800 border border-white/5 rounded-2xl p-8 text-center">
          <XCircle className="size-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Играта не е намерена</h1>
        </div>
      </Shell>
    );
  }

  const g = q.data;
  const content = (g.content ?? {}) as Record<string, unknown>;

  return (
    <Shell>
      <header className="mb-6">
        <TypeBadge type={g.game_type} />
        <h1 className="text-3xl font-bold text-white mt-2">{g.title}</h1>
        {g.description && <p className="text-slate-400 mt-1">{g.description}</p>}
        <p className="text-xs text-slate-500 mt-2">от {g.author_name}</p>
      </header>

      {g.game_type === "quiz" && <QuizPlayer content={content} />}
      {g.game_type === "crossword" && <CrosswordPlayer content={content} />}
      {g.game_type === "math_sprint" && <MathSprintPlayer content={content} />}
    </Shell>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; Icon: typeof Puzzle; accent: string }> = {
    quiz: { label: "Куиз", Icon: HelpCircle, accent: "text-amber-400" },
    crossword: { label: "Кръстословица", Icon: Puzzle, accent: "text-sky-400" },
    math_sprint: { label: "Math Sprint", Icon: Calculator, accent: "text-emerald-400" },
  };
  const m = map[type] ?? { label: type, Icon: Sparkles, accent: "text-slate-400" };
  return (
    <div className="inline-flex items-center gap-2">
      <m.Icon className={`size-4 ${m.accent}`} />
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
        {m.label}
      </span>
    </div>
  );
}

// ---------- Quiz ----------

type QuizQuestion = { q: string; options: string[]; correctIndex: number };

function QuizPlayer({ content }: { content: Record<string, unknown> }) {
  const questions = useMemo<QuizQuestion[]>(() => {
    const raw = Array.isArray(content.questions) ? content.questions : [];
    return raw.map((q: any) => ({
      q: String(q?.q ?? ""),
      options: Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : [],
      correctIndex: Number(q?.correctIndex ?? 0),
    }));
  }, [content]);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return <EmptyGame />;
  }

  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="bg-surface-800 border border-white/5 rounded-2xl p-5">
          <p className="font-medium text-white mb-3">
            {i + 1}. {q.q}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, oi) => {
              const chosen = answers[i] === oi;
              const isCorrect = submitted && oi === q.correctIndex;
              const isWrong = submitted && chosen && oi !== q.correctIndex;
              return (
                <button
                  key={oi}
                  onClick={() => !submitted && setAnswers((p) => ({ ...p, [i]: oi }))}
                  disabled={submitted}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    isCorrect
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : isWrong
                        ? "border-red-500/60 bg-red-500/10 text-red-200"
                        : chosen
                          ? "border-brand-primary bg-brand-primary/10 text-white"
                          : "border-white/10 hover:border-white/20 text-slate-200"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3">
        {submitted ? (
          <>
            <p className="text-lg font-bold text-white">
              Резултат: {score} / {questions.length}
            </p>
            <button
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-white/10 text-sm text-white hover:border-white/20"
            >
              <RotateCcw className="size-4" /> Опитай отново
            </button>
          </>
        ) : (
          <button
            onClick={() => setSubmitted(true)}
            disabled={Object.keys(answers).length !== questions.length}
            className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" /> Провери
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Crossword (word list reveal) ----------

type CwWord = { word: string; clue: string };

function CrosswordPlayer({ content }: { content: Record<string, unknown> }) {
  const words = useMemo<CwWord[]>(() => {
    const raw = Array.isArray(content.words) ? content.words : [];
    return raw.map((w: any) => ({
      word: String(w?.word ?? "").toUpperCase(),
      clue: String(w?.clue ?? ""),
    }));
  }, [content]);

  const [guesses, setGuesses] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  if (words.length === 0) return <EmptyGame />;

  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 space-y-3">
      <p className="text-sm text-slate-400 mb-2">
        Познай думата по подсказката. Всяко квадратче е една буква.
      </p>
      {words.map((w, i) => {
        const guess = (guesses[i] ?? "").toUpperCase();
        const correct = guess === w.word;
        const show = revealed[i];
        return (
          <div key={i} className="border border-white/10 rounded-xl p-4">
            <p className="text-sm text-slate-300 mb-2">
              <span className="font-mono text-slate-500 mr-2">{i + 1}.</span>
              {w.clue}
              <span className="ml-2 text-xs text-slate-600 font-mono">
                ({w.word.length} букви)
              </span>
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={guess}
                onChange={(e) =>
                  setGuesses((p) => ({
                    ...p,
                    [i]: e.target.value.toUpperCase().replace(/\s+/g, "").slice(0, w.word.length),
                  }))
                }
                disabled={show}
                placeholder="Твоят отговор"
                className={`px-3 py-2 rounded-lg bg-surface-900 border text-white font-mono tracking-widest text-sm focus:outline-none ${
                  show
                    ? "border-white/10 text-slate-400"
                    : correct
                      ? "border-emerald-500/60 text-emerald-200"
                      : "border-white/10 focus:border-brand-primary"
                }`}
              />
              {show ? (
                <span className="font-mono text-brand-secondary text-sm">{w.word}</span>
              ) : correct ? (
                <CheckCircle2 className="size-5 text-emerald-400" />
              ) : (
                <button
                  onClick={() => setRevealed((p) => ({ ...p, [i]: true }))}
                  className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                  покажи
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Math Sprint ----------

type MathOp = "+" | "-" | "×" | "÷";

function MathSprintPlayer({ content }: { content: Record<string, unknown> }) {
  const intro = typeof content.intro === "string" ? content.intro : null;
  const opts = (content.options ?? {}) as Record<string, unknown>;
  const duration = Math.max(15, Math.min(300, Number(opts.duration ?? 60)));
  const difficulty = String(opts.difficulty ?? "medium");
  const operations = (Array.isArray(opts.operations) ? opts.operations : ["+", "-", "×"]) as MathOp[];

  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState(() => makeProblem(difficulty, operations));
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      setPhase("done");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  function start() {
    setScore(0);
    setTimeLeft(duration);
    setProblem(makeProblem(difficulty, operations));
    setAnswer("");
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(answer);
    if (!Number.isFinite(n)) return;
    if (n === problem.result) setScore((s) => s + 1);
    setProblem(makeProblem(difficulty, operations));
    setAnswer("");
  }

  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
      {intro && <p className="text-slate-300 mb-4">{intro}</p>}
      <div className="flex items-center gap-4 text-sm text-slate-400 mb-6 flex-wrap">
        <span>Трудност: <strong className="text-white">{difficulty}</strong></span>
        <span>Време: <strong className="text-white">{duration}с</strong></span>
        <span>Операции: <strong className="text-white font-mono">{operations.join(" ")}</strong></span>
      </div>

      {phase === "idle" && (
        <button
          onClick={start}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90"
        >
          <Sparkles className="size-4" /> Започни
        </button>
      )}

      {phase === "playing" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-bold text-white">Точки: {score}</p>
            <p className="text-lg font-mono text-brand-secondary">{timeLeft}s</p>
          </div>
          <p className="text-4xl font-bold text-center text-white my-8 font-mono">
            {problem.a} {problem.op} {problem.b} = ?
          </p>
          <form onSubmit={submitAnswer} className="flex gap-2">
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              type="number"
              inputMode="numeric"
              className="flex-1 px-4 py-3 rounded-lg bg-surface-900 border border-white/10 text-white text-center text-xl font-mono focus:border-brand-primary focus:outline-none"
              placeholder="?"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90"
            >
              OK
            </button>
          </form>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center py-6">
          <CheckCircle2 className="size-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-2xl font-bold text-white mb-1">Край!</p>
          <p className="text-slate-300 mb-5">Реши {score} задачи за {duration} секунди.</p>
          <button
            onClick={start}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90"
          >
            <RotateCcw className="size-4" /> Отново
          </button>
        </div>
      )}
    </div>
  );
}

function makeProblem(difficulty: string, ops: MathOp[]) {
  const range =
    difficulty === "easy" ? 10 : difficulty === "hard" ? 50 : 20;
  const op = ops[Math.floor(Math.random() * ops.length)] ?? "+";
  let a = randInt(1, range);
  let b = randInt(1, range);
  let result = 0;
  if (op === "+") result = a + b;
  else if (op === "-") {
    if (b > a) [a, b] = [b, a];
    result = a - b;
  } else if (op === "×") {
    a = randInt(2, Math.max(2, Math.floor(range / 2)));
    b = randInt(2, Math.max(2, Math.floor(range / 2)));
    result = a * b;
  } else {
    // ÷ — build from product
    b = randInt(2, Math.max(2, Math.floor(range / 2)));
    result = randInt(2, Math.max(2, Math.floor(range / 2)));
    a = b * result;
  }
  return { a, b, op, result };
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function EmptyGame() {
  return (
    <div className="bg-surface-800 border border-dashed border-white/10 rounded-2xl p-10 text-center">
      <p className="text-slate-400">Играта няма съдържание.</p>
    </div>
  );
}
