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

// ---------- Crossword (interactive grid) ----------

type CwWord = { word: string; clue: string };

function CrosswordPlayer({ content }: { content: Record<string, unknown> }) {
  const words = useMemo<CwWord[]>(() => {
    const raw = Array.isArray(content.words) ? content.words : [];
    return raw.map((w: any) => ({
      word: String(w?.word ?? "").toUpperCase().replace(/\s+/g, ""),
      clue: String(w?.clue ?? ""),
    }));
  }, [content]);

  const layout = useMemo<Layout>(() => layoutCrossword(words), [words]);

  const [letters, setLetters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<{ row: number; col: number; dir: "across" | "down" } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (words.length === 0 || layout.placements.length === 0) return <EmptyGame />;

  const across = layout.placements.filter((p) => p.dir === "across").sort((a, b) => a.number - b.number);
  const down = layout.placements.filter((p) => p.dir === "down").sort((a, b) => a.number - b.number);
  const dropped = words.length - layout.placements.length;

  const activePlacementIdx =
    selected == null
      ? null
      : selected.dir === "across"
        ? layout.grid[selected.row]?.[selected.col]?.across ?? null
        : layout.grid[selected.row]?.[selected.col]?.down ?? null;

  function cellKey(r: number, c: number) {
    return `${r},${c}`;
  }

  function focusCell(r: number, c: number) {
    const el = inputRefs.current[cellKey(r, c)];
    if (el) el.focus();
  }

  function handleType(r: number, c: number, val: string) {
    const ch = val.toUpperCase().replace(/[^А-Я A-Z]/g, "").slice(-1);
    setLetters((p) => ({ ...p, [cellKey(r, c)]: ch }));
    setChecked(false);
    // Auto-advance in current direction
    if (!ch || !selected) return;
    const dir = selected.dir;
    const nr = dir === "across" ? r : r + 1;
    const nc = dir === "across" ? c + 1 : c;
    if (layout.grid[nr]?.[nc]) focusCell(nr, nc);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) {
    const dir = selected?.dir ?? "across";
    if (e.key === "Backspace" && !letters[cellKey(r, c)]) {
      const pr = dir === "across" ? r : r - 1;
      const pc = dir === "across" ? c - 1 : c;
      if (layout.grid[pr]?.[pc]) focusCell(pr, pc);
    } else if (e.key === "ArrowRight") {
      if (layout.grid[r]?.[c + 1]) { setSelected({ row: r, col: c + 1, dir: "across" }); focusCell(r, c + 1); }
    } else if (e.key === "ArrowLeft") {
      if (layout.grid[r]?.[c - 1]) { setSelected({ row: r, col: c - 1, dir: "across" }); focusCell(r, c - 1); }
    } else if (e.key === "ArrowDown") {
      if (layout.grid[r + 1]?.[c]) { setSelected({ row: r + 1, col: c, dir: "down" }); focusCell(r + 1, c); }
    } else if (e.key === "ArrowUp") {
      if (layout.grid[r - 1]?.[c]) { setSelected({ row: r - 1, col: c, dir: "down" }); focusCell(r - 1, c); }
    } else if (e.key === " ") {
      e.preventDefault();
      setSelected((s) => (s ? { ...s, dir: s.dir === "across" ? "down" : "across" } : s));
    }
  }

  function cellClick(r: number, c: number) {
    const cell = layout.grid[r][c]!;
    // If already selected here, toggle direction; otherwise pick a direction that exists at this cell
    if (selected && selected.row === r && selected.col === c) {
      const other = selected.dir === "across" ? "down" : "across";
      if ((other === "across" && cell.across != null) || (other === "down" && cell.down != null)) {
        setSelected({ row: r, col: c, dir: other });
      }
    } else {
      const dir = cell.across != null ? "across" : "down";
      setSelected({ row: r, col: c, dir });
    }
    focusCell(r, c);
  }

  function checkAll() {
    setChecked(true);
  }

  function revealAll() {
    const full: Record<string, string> = {};
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const cell = layout.grid[r][c];
        if (cell) full[cellKey(r, c)] = cell.letter;
      }
    }
    setLetters(full);
    setRevealed(true);
    setChecked(true);
  }

  function reset() {
    setLetters({});
    setChecked(false);
    setRevealed(false);
    setSelected(null);
  }

  // Count solved cells
  let filled = 0;
  let correct = 0;
  let total = 0;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const cell = layout.grid[r][c];
      if (!cell) continue;
      total++;
      const v = letters[cellKey(r, c)] ?? "";
      if (v) filled++;
      if (v === cell.letter) correct++;
    }
  }
  const allCorrect = correct === total;

  return (
    <div className="space-y-6">
      {dropped > 0 && (
        <div className="text-xs text-slate-500 bg-surface-800 border border-white/5 rounded-lg px-3 py-2">
          Забележка: {dropped} {dropped === 1 ? "дума" : "думи"} не се вписват в решетката и са пропуснати.
        </div>
      )}

      <div className="bg-surface-800 border border-white/5 rounded-2xl p-4 sm:p-6 overflow-auto">
        <div
          className="grid mx-auto"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            width: `min(100%, ${layout.cols * 40}px)`,
          }}
        >
          {Array.from({ length: layout.rows }).map((_, r) =>
            Array.from({ length: layout.cols }).map((_, c) => {
              const cell = layout.grid[r][c];
              if (!cell) return <div key={`${r}-${c}`} className="aspect-square" />;

              const key = cellKey(r, c);
              const val = letters[key] ?? "";
              const isSelected = selected?.row === r && selected?.col === c;
              const inActiveWord =
                activePlacementIdx != null &&
                (cell.across === activePlacementIdx || cell.down === activePlacementIdx);
              const wrong = checked && val && val !== cell.letter;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`aspect-square relative border ${
                    isSelected
                      ? "border-brand-primary bg-brand-primary/20"
                      : inActiveWord
                        ? "border-white/20 bg-brand-primary/5"
                        : "border-white/10 bg-surface-900"
                  }`}
                >
                  {cell.number != null && (
                    <span className="absolute top-0 left-0.5 text-[9px] font-mono text-slate-500 leading-none pt-0.5 pointer-events-none">
                      {cell.number}
                    </span>
                  )}
                  <input
                    ref={(el) => {
                      inputRefs.current[key] = el;
                    }}
                    value={val}
                    onChange={(e) => handleType(r, c, e.target.value)}
                    onKeyDown={(e) => handleKey(e, r, c)}
                    onFocus={() => cellClick(r, c)}
                    onClick={() => cellClick(r, c)}
                    maxLength={2}
                    className={`w-full h-full bg-transparent text-center font-mono font-bold uppercase text-sm sm:text-base focus:outline-none ${
                      wrong ? "text-red-400" : checked && val ? "text-emerald-300" : "text-white"
                    }`}
                  />
                </div>
              );
            }),
          )}
        </div>

        <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
          <p className="text-xs font-mono text-slate-500">
            {filled}/{total} букви{checked ? ` · ${correct} верни` : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 border border-white/10 text-xs text-slate-300 hover:border-white/20"
            >
              <RotateCcw className="size-3.5" /> Изчисти
            </button>
            <button
              onClick={revealAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 border border-white/10 text-xs text-slate-300 hover:border-white/20"
            >
              <Eye className="size-3.5" /> Покажи
            </button>
            <button
              onClick={checkAll}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90"
            >
              <CheckCircle2 className="size-3.5" /> Провери
            </button>
          </div>
        </div>

        {checked && !revealed && (
          <p
            className={`mt-3 text-sm font-bold text-center ${
              allCorrect ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {allCorrect
              ? "Браво! Всички думи са верни."
              : `Има ${total - correct} неверни или празни клетки.`}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ClueList title="Хоризонтално" list={across} activeIdx={activePlacementIdx} placements={layout.placements} onPick={(p) => { setSelected({ row: p.row, col: p.col, dir: p.dir }); focusCell(p.row, p.col); }} />
        <ClueList title="Вертикално" list={down} activeIdx={activePlacementIdx} placements={layout.placements} onPick={(p) => { setSelected({ row: p.row, col: p.col, dir: p.dir }); focusCell(p.row, p.col); }} />
      </div>
    </div>
  );
}

function ClueList({
  title,
  list,
  activeIdx,
  placements,
  onPick,
}: {
  title: string;
  list: Layout["placements"];
  activeIdx: number | null;
  placements: Layout["placements"];
  onPick: (p: Layout["placements"][number]) => void;
}) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-5">
      <h3 className="text-xs font-mono uppercase tracking-widest text-brand-secondary mb-3">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {list.map((p) => {
          const idx = placements.indexOf(p);
          const active = idx === activeIdx;
          return (
            <li key={`${p.dir}-${p.number}`}>
              <button
                onClick={() => onPick(p)}
                className={`text-left w-full text-sm rounded px-2 py-1 transition-colors ${
                  active
                    ? "bg-brand-primary/15 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="font-mono text-slate-500 mr-2">{p.number}.</span>
                {p.clue}
                <span className="ml-2 text-xs text-slate-600 font-mono">
                  ({p.word.length})
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="text-xs text-slate-600">Няма думи.</li>
        )}
      </ul>
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
