import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getMyModStatus } from "@/lib/community.functions";
import { aiDraftGame, submitCommunityGame, listMyGames } from "@/lib/mod-games.functions";
import { toast } from "sonner";
import {
  Sparkles,
  Puzzle,
  HelpCircle,
  Calculator,
  Plus,
  Trash2,
  Wand2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/moderator")({
  head: () => ({
    meta: [
      { title: "Модераторски панел — IDMgames" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ModeratorPage,
});

type Tab = "quiz" | "crossword" | "math_sprint";

function ModeratorPage() {
  const statusFn = useServerFn(getMyModStatus);
  const status = useQuery({ queryKey: ["my-mod-status"], queryFn: () => statusFn() });
  const [tab, setTab] = useState<Tab>("quiz");

  if (status.isLoading) {
    return (
      <Shell>
        <p className="text-slate-500">Зареждане...</p>
      </Shell>
    );
  }
  if (!status.data?.isModerator) {
    return (
      <Shell>
        <div className="max-w-lg bg-surface-800 border border-white/5 rounded-2xl p-8 text-center">
          <XCircle className="size-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white mb-2">Нямаш достъп</h1>
          <p className="text-slate-400 mb-4">
            Тази страница е за одобрени модератори. Подай заявка от страницата „От
            потребителите“.
          </p>
          <Link
            to="/community"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-bold"
          >
            Към общността
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="size-6 text-brand-secondary" />
        <p className="text-xs font-mono uppercase tracking-widest text-brand-secondary">
          Модератор
        </p>
      </div>
      <h1 className="text-4xl font-bold text-white mb-2">Създай нова игра</h1>
      <p className="text-slate-400 mb-6">
        Избери тип, генерирай чернова с AI, редактирай и изпрати за одобрение от админ.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <TabButton active={tab === "quiz"} onClick={() => setTab("quiz")} icon={HelpCircle}>
          Куиз
        </TabButton>
        <TabButton
          active={tab === "crossword"}
          onClick={() => setTab("crossword")}
          icon={Puzzle}
        >
          Кръстословица
        </TabButton>
        <TabButton
          active={tab === "math_sprint"}
          onClick={() => setTab("math_sprint")}
          icon={Calculator}
        >
          Math Sprint
        </TabButton>
      </div>

      {tab === "quiz" && <QuizForm />}
      {tab === "crossword" && <CrosswordForm />}
      {tab === "math_sprint" && <MathSprintForm />}

      <MyGamesList />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">{children}</main>
      <Footer />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Puzzle;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
        active
          ? "bg-brand-primary text-white border-brand-primary"
          : "bg-surface-800 text-slate-300 border-white/10 hover:border-white/20"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

// ---------- Shared meta fields ----------

function MetaFields({
  title,
  setTitle,
  description,
  setDescription,
  topic,
  setTopic,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Заглавие">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          className="input"
          placeholder="Столици на Европа"
        />
      </Field>
      <Field label="Тема (за AI)">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, 200))}
          className="input"
          placeholder="география, столици"
        />
      </Field>
      <Field label="Описание (по избор)" className="sm:col-span-2">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={2}
          className="input resize-none"
          placeholder="Кратко описание, което ще се вижда в списъка."
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

// ---------- Quiz Form ----------

type QuizQuestion = { q: string; options: string[]; correctIndex: number };

function QuizForm() {
  const qc = useQueryClient();
  const draftFn = useServerFn(aiDraftGame);
  const submitFn = useServerFn(submitCommunityGame);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const draftMut = useMutation({
    mutationFn: () => draftFn({ data: { type: "quiz", topic, options: { count } } }),
    onSuccess: (res) => {
      try {
        const parsed = JSON.parse(res.draftJson);
        const qs = Array.isArray(parsed.questions) ? parsed.questions : [];
        setQuestions(
          qs.slice(0, 20).map((q: any) => ({
            q: String(q.q ?? ""),
            options: Array.isArray(q.options)
              ? q.options.slice(0, 4).map((o: any) => String(o))
              : ["", "", "", ""],
            correctIndex: Number(q.correctIndex ?? 0),
          })),
        );
        toast.success(`Заредени са ${qs.length} въпроса. Прегледай и редактирай.`);
      } catch {
        toast.error("Грешка при парсване на AI отговор");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Грешка"),
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          type: "quiz",
          title,
          description,
          topic,
          contentJson: JSON.stringify({ questions }),
        },
      }),
    onSuccess: () => {
      toast.success("Играта е изпратена за одобрение!");
      setTitle("");
      setDescription("");
      setTopic("");
      setQuestions([]);
      qc.invalidateQueries({ queryKey: ["my-games"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Грешка"),
  });

  function updateQ(i: number, patch: Partial<QuizQuestion>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function updateOption(i: number, oi: number, v: string) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === i ? { ...q, options: q.options.map((o, k) => (k === oi ? v : o)) } : q,
      ),
    );
  }
  function addQ() {
    setQuestions((p) => [...p, { q: "", options: ["", "", "", ""], correctIndex: 0 }]);
  }
  function removeQ(i: number) {
    setQuestions((p) => p.filter((_, idx) => idx !== i));
  }

  const canSubmit = title.trim() && questions.length > 0 && questions.every(
    (q) => q.q.trim() && q.options.every((o) => o.trim()),
  );

  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 space-y-6">
      <MetaFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        topic={topic}
        setTopic={setTopic}
      />
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Брой въпроси">
          <input
            type="number"
            min={3}
            max={15}
            value={count}
            onChange={(e) => setCount(Math.max(3, Math.min(15, Number(e.target.value) || 5)))}
            className="input w-24"
          />
        </Field>
        <button
          onClick={() => draftMut.mutate()}
          disabled={!topic.trim() || draftMut.isPending}
          className="btn-secondary"
        >
          <Wand2 className="size-4" />
          {draftMut.isPending ? "Генериране..." : "Генерирай с AI"}
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="bg-surface-900 border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-xs font-mono text-slate-500">Въпрос {i + 1}</span>
              <button
                onClick={() => removeQ(i)}
                className="text-red-400 hover:text-red-300"
                aria-label="Изтрий"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <textarea
              value={q.q}
              onChange={(e) => updateQ(i, { q: e.target.value })}
              placeholder="Формулировка на въпроса"
              rows={2}
              className="input resize-none mb-3"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${
                    q.correctIndex === oi
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.correctIndex === oi}
                    onChange={() => updateQ(i, { correctIndex: oi })}
                  />
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, oi, e.target.value)}
                    placeholder={`Отговор ${oi + 1}`}
                    className="input flex-1 bg-transparent border-0 p-0"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={addQ} className="btn-outline">
          <Plus className="size-4" /> Добави въпрос
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => submitMut.mutate()}
          disabled={!canSubmit || submitMut.isPending}
          className="btn-primary"
        >
          {submitMut.isPending ? "Изпращане..." : "Изпрати за одобрение"}
        </button>
      </div>
    </div>
  );
}

// ---------- Crossword Form (word list) ----------

type CwWord = { word: string; clue: string };

function CrosswordForm() {
  const qc = useQueryClient();
  const draftFn = useServerFn(aiDraftGame);
  const submitFn = useServerFn(submitCommunityGame);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [words, setWords] = useState<CwWord[]>([]);

  const draftMut = useMutation({
    mutationFn: () => draftFn({ data: { type: "crossword", topic, options: { count } } }),
    onSuccess: (res) => {
      try {
        const parsed = JSON.parse(res.draftJson);
        const ws = Array.isArray(parsed.words) ? parsed.words : [];
        setWords(
          ws.slice(0, 30).map((w: any) => ({
            word: String(w.word ?? "").toUpperCase().replace(/\s+/g, ""),
            clue: String(w.clue ?? ""),
          })),
        );
        toast.success(`Заредени са ${ws.length} думи.`);
      } catch {
        toast.error("Грешка при парсване на AI отговор");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Грешка"),
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          type: "crossword",
          title,
          description,
          topic,
          contentJson: JSON.stringify({ words }),
        },
      }),
    onSuccess: () => {
      toast.success("Играта е изпратена за одобрение!");
      setTitle("");
      setDescription("");
      setTopic("");
      setWords([]);
      qc.invalidateQueries({ queryKey: ["my-games"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Грешка"),
  });

  const canSubmit =
    title.trim() && words.length >= 3 && words.every((w) => w.word.trim() && w.clue.trim());

  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 space-y-6">
      <MetaFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        topic={topic}
        setTopic={setTopic}
      />
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Брой думи">
          <input
            type="number"
            min={3}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(3, Math.min(20, Number(e.target.value) || 8)))}
            className="input w-24"
          />
        </Field>
        <button
          onClick={() => draftMut.mutate()}
          disabled={!topic.trim() || draftMut.isPending}
          className="btn-secondary"
        >
          <Wand2 className="size-4" />
          {draftMut.isPending ? "Генериране..." : "Генерирай с AI"}
        </button>
      </div>

      <div className="space-y-2">
        {words.map((w, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
            <input
              value={w.word}
              onChange={(e) =>
                setWords((p) =>
                  p.map((x, idx) =>
                    idx === i
                      ? { ...x, word: e.target.value.toUpperCase().replace(/\s+/g, "") }
                      : x,
                  ),
                )
              }
              placeholder="ДУМА"
              className="input font-mono"
            />
            <input
              value={w.clue}
              onChange={(e) =>
                setWords((p) => p.map((x, idx) => (idx === i ? { ...x, clue: e.target.value } : x)))
              }
              placeholder="Подсказка"
              className="input"
            />
            <button
              onClick={() => setWords((p) => p.filter((_, idx) => idx !== i))}
              className="text-red-400 hover:text-red-300 px-2"
              aria-label="Изтрий"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setWords((p) => [...p, { word: "", clue: "" }])}
          className="btn-outline"
        >
          <Plus className="size-4" /> Добави дума
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => submitMut.mutate()}
          disabled={!canSubmit || submitMut.isPending}
          className="btn-primary"
        >
          {submitMut.isPending ? "Изпращане..." : "Изпрати за одобрение"}
        </button>
      </div>
    </div>
  );
}

// ---------- Math Sprint Form ----------

function MathSprintForm() {
  const qc = useQueryClient();
  const draftFn = useServerFn(aiDraftGame);
  const submitFn = useServerFn(submitCommunityGame);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [ops, setOps] = useState<string[]>(["+", "-", "×"]);
  const [intro, setIntro] = useState("");

  const draftMut = useMutation({
    mutationFn: () =>
      draftFn({
        data: {
          type: "math_sprint",
          topic: topic || "аритметика",
          options: { duration, difficulty, operations: ops },
        },
      }),
    onSuccess: (res) => {
      try {
        const parsed = JSON.parse(res.draftJson);
        setIntro(String(parsed.intro ?? ""));
        toast.success("Черновата е готова.");
      } catch {
        toast.error("Грешка при парсване на AI отговор");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Грешка"),
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          type: "math_sprint",
          title,
          description,
          topic,
          contentJson: JSON.stringify({ duration, difficulty, operations: ops, intro }),
        },
      }),
    onSuccess: () => {
      toast.success("Играта е изпратена за одобрение!");
      setTitle("");
      setDescription("");
      setTopic("");
      setIntro("");
      qc.invalidateQueries({ queryKey: ["my-games"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Грешка"),
  });

  function toggleOp(op: string) {
    setOps((prev) => (prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]));
  }

  const canSubmit = title.trim() && ops.length > 0 && intro.trim();

  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 space-y-6">
      <MetaFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        topic={topic}
        setTopic={setTopic}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Продължителност (сек)">
          <input
            type="number"
            min={30}
            max={300}
            value={duration}
            onChange={(e) => setDuration(Math.max(30, Math.min(300, Number(e.target.value) || 60)))}
            className="input"
          />
        </Field>
        <Field label="Трудност">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="input"
          >
            <option value="easy">Лесна</option>
            <option value="medium">Средна</option>
            <option value="hard">Трудна</option>
          </select>
        </Field>
        <Field label="Операции">
          <div className="flex gap-1 flex-wrap">
            {["+", "-", "×", "÷"].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => toggleOp(op)}
                className={`size-10 rounded-lg border font-mono font-bold ${
                  ops.includes(op)
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-surface-900 border-white/10 text-slate-400"
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div>
        <button
          onClick={() => draftMut.mutate()}
          disabled={draftMut.isPending}
          className="btn-secondary"
        >
          <Wand2 className="size-4" />
          {draftMut.isPending ? "Генериране..." : "Генерирай въведение с AI"}
        </button>
      </div>

      <Field label="Въведение към играча">
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value.slice(0, 500))}
          rows={4}
          className="input resize-none"
          placeholder="Кратко описание, което ще види играчът преди старт."
        />
      </Field>

      <div className="flex justify-end">
        <button
          onClick={() => submitMut.mutate()}
          disabled={!canSubmit || submitMut.isPending}
          className="btn-primary"
        >
          {submitMut.isPending ? "Изпращане..." : "Изпрати за одобрение"}
        </button>
      </div>
    </div>
  );
}

// ---------- My games list ----------

function MyGamesList() {
  const listFn = useServerFn(listMyGames);
  const games = useQuery({ queryKey: ["my-games"], queryFn: () => listFn() });

  const STATUS: Record<
    string,
    { label: string; icon: typeof Clock; className: string }
  > = {
    pending: { label: "Чака одобрение", icon: Clock, className: "text-amber-400" },
    approved: { label: "Одобрена", icon: CheckCircle2, className: "text-emerald-400" },
    rejected: { label: "Отказана", icon: XCircle, className: "text-red-400" },
  };

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white mb-4">Моите игри</h2>
      {games.isLoading ? (
        <p className="text-slate-500 text-sm">Зареждане...</p>
      ) : !games.data || games.data.length === 0 ? (
        <p className="text-slate-500 text-sm">Още нямаш изпратени игри.</p>
      ) : (
        <div className="space-y-2">
          {games.data.map((g) => {
            const s = STATUS[g.status] ?? STATUS.pending;
            const Icon = s.icon;
            return (
              <div
                key={g.id}
                className="bg-surface-800 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{g.title}</p>
                  <p className="text-xs text-slate-500 font-mono uppercase">
                    {g.game_type} · {new Date(g.created_at).toLocaleDateString("bg-BG")}
                  </p>
                  {g.reject_reason && (
                    <p className="text-xs text-red-300 mt-1">Причина: {g.reject_reason}</p>
                  )}
                </div>
                <div className={`flex items-center gap-2 text-sm ${s.className}`}>
                  <Icon className="size-4" />
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
