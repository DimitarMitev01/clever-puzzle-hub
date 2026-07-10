import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GameCard } from "@/components/GameCard";
import { GAMES } from "@/lib/games";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IDMgames — Логически игри и пъзели на едно място" },
      {
        name: "description",
        content:
          "Играй Sudoku, 2048, Snake, Tic-Tac-Toe, Memory, Wordle и още логически игри онлайн. Регистрирай се и следи най-добрите си резултати.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const liveCount = GAMES.filter((g) => g.status === "live").length;

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary/25 via-brand-primary/10 to-surface-800 border border-white/5 p-8 md:p-14">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-block px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-[10px] font-bold mb-5 tracking-widest uppercase">
                Платформа за логическо мислене
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 leading-[1.05] tracking-tight">
                Тренирай ума си <br />с {liveCount}+ логически игри
              </h1>
              <p className="text-slate-300 text-lg mb-8 max-w-lg leading-relaxed">
                Без реклами. С личен профил, статистика и класация. Играй директно в браузъра.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#games"
                  className="px-7 py-3 bg-white text-surface-900 font-bold rounded-xl hover:bg-brand-primary hover:text-white transition-all"
                >
                  Разгледай игрите
                </a>
                {!user && (
                  <Link
                    to="/auth"
                    className="px-7 py-3 bg-surface-800/80 text-white font-bold rounded-xl border border-white/10 hover:border-brand-primary/50 transition-all"
                  >
                    Създай профил
                  </Link>
                )}
              </div>
            </div>
            <div className="absolute -right-16 -bottom-16 size-80 rounded-full bg-brand-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -right-4 top-4 size-40 rounded-full bg-brand-secondary/20 blur-3xl pointer-events-none" />
          </div>
        </section>

        {/* Games grid */}
        <section id="games">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Всички логически игри</h2>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              {GAMES.length} игри
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GAMES.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        {/* Stats teaser */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-800/50 p-6 rounded-2xl border border-white/5">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Активни игри
            </p>
            <p className="text-3xl font-bold text-white">
              {liveCount} <span className="text-sm font-normal text-slate-500">достъпни</span>
            </p>
          </div>
          <div className="bg-surface-800/50 p-6 rounded-2xl border border-white/5">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Личен профил
            </p>
            <p className="text-3xl font-bold text-white">
              ∞ <span className="text-sm font-normal text-slate-500">резултати</span>
            </p>
          </div>
          <div className="bg-surface-800/50 p-6 rounded-2xl border border-white/5">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Реклами
            </p>
            <p className="text-3xl font-bold text-brand-secondary">
              0 <span className="text-sm font-normal text-slate-500">никога</span>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
