import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, getGame } from "@/lib/games";
import { User as UserIcon, Trophy, Clock, Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Моят профил — IDMgames" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();

  const profileQuery = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const scoresQuery = useQuery({
    queryKey: ["scores", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const scores = scoresQuery.data ?? [];
  const totalGames = scores.length;
  const totalSeconds = scores.reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  const bestByGame: Record<string, { score: number; won: boolean }> = {};
  for (const r of scores) {
    const prev = bestByGame[r.game_slug];
    if (!prev || r.score > prev.score) {
      bestByGame[r.game_slug] = { score: r.score, won: r.won };
    }
  }

  const profile = profileQuery.data;
  const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Играч";

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Header card */}
        <div className="bg-gradient-to-br from-brand-primary/20 via-surface-800 to-surface-800 rounded-3xl border border-white/5 p-8 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="size-20 rounded-2xl bg-surface-700 border border-white/10 flex items-center justify-center">
            <UserIcon className="size-10 text-slate-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-mono text-brand-secondary uppercase tracking-widest mb-1">Профил</p>
            <h1 className="text-3xl font-bold text-white">{displayName}</h1>
            <p className="text-slate-400 text-sm mt-1">{user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard icon={<Gamepad2 className="size-5" />} label="Общо изиграни" value={String(totalGames)} suffix="игри" />
          <StatCard icon={<Clock className="size-5" />} label="Общо време" value={hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`} suffix="в платформата" />
          <StatCard
            icon={<Trophy className="size-5" />}
            label="Победи"
            value={String(scores.filter((s) => s.won).length)}
            suffix="общо"
            highlight
          />
        </div>

        {/* Best scores */}
        <section>
          <h2 className="text-xl font-bold text-white mb-5">Най-добри резултати по игра</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAMES.filter((g) => g.status === "live").map((g) => {
              const best = bestByGame[g.slug];
              return (
                <Link
                  key={g.slug}
                  to={g.route!}
                  className="group bg-surface-800 rounded-xl border border-white/5 p-5 hover:border-brand-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-mono text-brand-secondary uppercase tracking-wider">
                      {g.category}
                    </p>
                    <span className="text-xs text-brand-primary group-hover:underline">Играй →</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{g.title}</h3>
                  <div className="text-3xl font-bold text-white font-mono">
                    {best ? best.score.toLocaleString() : "—"}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                    {best ? "Личен рекорд" : "Няма записан резултат"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent */}
        {scores.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white mb-5">Последни игри</h2>
            <div className="bg-surface-800 rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3">Игра</th>
                    <th className="px-5 py-3">Резултат</th>
                    <th className="px-5 py-3">Резултат</th>
                    <th className="px-5 py-3 hidden sm:table-cell">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.slice(0, 15).map((s) => (
                    <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-semibold text-white">
                        {getGame(s.game_slug)?.title ?? s.game_slug}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-300">{s.score}</td>
                      <td className="px-5 py-3">
                        {s.won ? (
                          <span className="text-brand-secondary text-xs font-bold">ПОБЕДА</span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">
                        {new Date(s.created_at).toLocaleString("bg-BG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-surface-800/60 p-6 rounded-2xl border border-white/5">
      <div className="flex items-center gap-2 text-slate-400 mb-3">
        {icon}
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${highlight ? "text-brand-secondary" : "text-white"}`}>
        {value} <span className="text-sm font-normal text-slate-500">{suffix}</span>
      </p>
    </div>
  );
}
