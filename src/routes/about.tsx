import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import {
  Brain,
  Puzzle,
  Target,
  Zap,
  Users,
  Trophy,
  Sparkles,
  Lightbulb,
  Clock,
  HeartHandshake,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "За нас — IDMgames" },
      {
        name: "description",
        content:
          "Научи повече за IDMgames — платформата за логически игри и пъзели, която тренира ума без реклами и с личен профил.",
      },
    ],
  }),
  component: AboutPage,
});

const BENEFITS = [
  {
    icon: Brain,
    title: "Логическо мислене",
    desc: "Анализирай информация, разпознавай модели и вземай обосновани решения — умения, полезни в ежедневието.",
  },
  {
    icon: Target,
    title: "Концентрация",
    desc: "В свят на постоянни разсейвания пъзел игрите учат фокус върху една задача за по-дълго време.",
  },
  {
    icon: Zap,
    title: "Памет",
    desc: "Постоянното упражнение поддържа краткосрочната памет остра и подобрява запаметяването на нова информация.",
  },
  {
    icon: HeartHandshake,
    title: "Намаляване на стреса",
    desc: "Потапянето в пъзел е форма на медитация — откъсва те от грижите и има успокояващ ефект.",
  },
];

const TIPS = [
  "Започни с по-лесни нива — всеки експерт е бил начинаещ.",
  "Бъди търпелив — някои пъзели изискват време и повторни опити.",
  "Прави паузи — решението често идва, когато не мислиш активно за проблема.",
  "Учи се от грешките — анализирай какво не е сработило и пробвай различен подход.",
  "Експериментирай с различни жанрове — разнообразието поддържа интереса.",
  "Играй редовно — дори 10-15 минути дневно правят разлика.",
];

function AboutPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        {/* Hero */}
        <section className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/15 text-brand-primary text-xs font-bold tracking-widest uppercase mb-5">
            <Sparkles className="size-3.5" />
            IDMgames
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight tracking-tight">
            Пъзел игри: Пътят към по-остър ум
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Търсиш начин да се отпуснеш, докато тренираш мозъка си? Логическите
            игри на IDMgames съчетават развлечение и умствена стимулация — без
            реклами, с личен профил и статистика.
          </p>
        </section>

        {/* What are puzzle games */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <Puzzle className="size-6 text-brand-primary" />
            <h2 className="text-2xl font-bold text-white">Какво представляват?</h2>
          </div>
          <div className="bg-surface-800/50 border border-white/5 rounded-2xl p-6 md:p-8 space-y-4 text-slate-300 leading-relaxed">
            <p>
              Пъзел игрите са интелектуални игри, които изискват логика, стратегия
              и решаване на проблеми. За разлика от екшън заглавията, тук акцентът
              е върху умствените способности — да подредиш елементи, да намериш
              скрито решение или да изградиш печеливша стратегия.
            </p>
            <p>
              Историята им датира от векове — от древните китайски танграми до
              съвременните дигитални версии. Днес са достъпни на всяко устройство,
              а IDMgames събира най-добрите от тях на едно място.
            </p>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <Lightbulb className="size-6 text-brand-secondary" />
            <h2 className="text-2xl font-bold text-white">Видове игри в IDMgames</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "Логически и стратегически",
                games: "Tic-Tac-Toe, 2048, Sudoku, Sliding Puzzle",
                desc: "Планирай ходовете си, предвиждай противника и мисли тактически.",
              },
              {
                title: "Игри за памет и концентрация",
                games: "Memory",
                desc: "Запомняй позиции, модели и последователности за по-дълго време.",
              },
              {
                title: "Словесни пъзели",
                games: "Бесеница, Wordle, Намери думата",
                desc: "Обогатявай речника си и развивай дедуктивно мислене чрез думи.",
              },
              {
                title: "Пъзели за подреждане",
                games: "Тетрис, Нареди числата",
                desc: "Организирай елементи в правилен ред с пространствено мислене.",
              },
            ].map((cat) => (
              <div
                key={cat.title}
                className="bg-surface-800/40 border border-white/5 rounded-2xl p-6 hover:border-brand-primary/30 transition-colors"
              >
                <h3 className="text-white font-bold mb-1">{cat.title}</h3>
                <p className="text-brand-secondary text-xs font-mono mb-3">
                  {cat.games}
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <Trophy className="size-6 text-brand-primary" />
            <h2 className="text-2xl font-bold text-white">Ползи от пъзел игрите</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex gap-4 bg-surface-800/40 border border-white/5 rounded-2xl p-5"
              >
                <div className="shrink-0 mt-0.5">
                  <div className="size-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                    <b.icon className="size-5 text-brand-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">{b.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-slate-400 text-sm leading-relaxed bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-5">
            <strong className="text-white">Забавяне на когнитивното застаряване:</strong>{" "}
            Изследвания показват, че редовната умствена стимулация чрез пъзели
            помага за поддържане на когнитивните функции с възрастта и може да
            намали риска от деменция.
          </p>
        </section>

        {/* Game recommendations */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <Users className="size-6 text-brand-secondary" />
            <h2 className="text-2xl font-bold text-white">Популярни игри, които да опиташ</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                name: "Tic-Tac-Toe",
                desc: "Класическа стратегия за двама — учи на планиране напред и предвиждане на противника.",
              },
              {
                name: "Snake",
                desc: "Управлявай змията, която расте с всяка изядена храна. Тренира рефлекси и пространствено мислене.",
              },
              {
                name: "2048",
                desc: "Съчетай плочки с еднакви числа, за да достигнеш 2048. Развива математическо мислене.",
              },
              {
                name: "Memory",
                desc: "Намирай двойки карти, като разчиташ на краткосрочната си памет.",
              },
              {
                name: "Бесеница",
                desc: "Познай думата буква по буква. Обогатява речника и дедуктивното мислене.",
              },
              {
                name: "Wordle",
                desc: "Разгадай скритата дума с логика и езикови умения.",
              },
              {
                name: "Тетрис",
                desc: "Подреждай падащи блокове под натиск. Развива пространственото мислене.",
              },
              {
                name: "Нареди числата",
                desc: "Подреди числата в правилен ред чрез плъзгане. Тренира логиката и търпението.",
              },
            ].map((g) => (
              <div
                key={g.name}
                className="flex items-start gap-4 bg-surface-800/30 border border-white/5 rounded-xl px-5 py-4"
              >
                <div className="size-2 rounded-full bg-brand-primary mt-2 shrink-0" />
                <div>
                  <span className="text-white font-semibold">{g.name}</span>
                  <span className="text-slate-400 text-sm"> — {g.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <Clock className="size-6 text-brand-primary" />
            <h2 className="text-2xl font-bold text-white">Съвети за начинаещи</h2>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TIPS.map((tip, i) => (
              <li
                key={i}
                className="flex gap-3 bg-surface-800/40 border border-white/5 rounded-xl px-5 py-4"
              >
                <span className="text-brand-primary font-bold text-lg shrink-0">
                  {i + 1}.
                </span>
                <p className="text-slate-300 text-sm leading-relaxed">{tip}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-br from-brand-primary/20 via-brand-primary/5 to-surface-800 border border-white/5 rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Започни своето пъзел приключение днес!
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
            Пъзел игрите са инвестиция в умственото ти здраве. Независимо дали си
            на 8 или 80, има игра, подходяща за теб. Всяко решено предизвикателство
            те прави по-съобразителен и уверен.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="px-7 py-3 bg-white text-surface-900 font-bold rounded-xl hover:bg-brand-primary hover:text-white transition-all"
            >
              Разгледай игрите
            </Link>
            {!user && (
              <Link
                to="/auth"
                className="px-7 py-3 bg-surface-800/80 text-white font-bold rounded-xl border border-white/10 hover:border-brand-primary/50 transition-all"
              >
                Създай профил
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
