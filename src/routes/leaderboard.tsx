import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, getGame } from "@/lib/games";
import { Trophy } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [{ title: "Класация — IDMgames" }],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const liveGames = GAMES.filter((g) => g.status === "live");
  const [gameSlug, setGameSlug] = useState(liveGames[0]?.slug ?? "");

  const query = useQuery({
    queryKey: ["leaderboard", gameSlug],
    queryFn: async () => {
      const { data: scores } = await supabase
        .from("game_scores")
        .select("id, score, duration_seconds, user_id, created_at")
        .eq("game_slug", gameSlug)
        .order("score", { ascending: false })
        .limit(20);
      const rows = scores ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const profileMap: Record<string, { display_name: string | null; username: string | null }> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", userIds);
        for (const p of profiles ?? []) profileMap[p.id] = { display_name: p.display_name, username: p.username };
      }
      return rows.map((r) => ({ ...r, profiles: profileMap[r.user_id] ?? null }));
    },
  });

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="size-6 text-brand-secondary" />
          <p className="text-xs font-mono uppercase tracking-widest text-brand-secondary">Топ играчи</p>
        </div>
        <h1 className="text-4xl font-bold text-white mb-8">Класация</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {liveGames.map((g) => (
            <button
              key={g.slug}
              onClick={() => setGameSlug(g.slug)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                gameSlug === g.slug
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-surface-800 text-slate-300 border-white/10 hover:border-brand-primary/40"
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>

        <div className="bg-surface-800 rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-mono">
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 w-16">Ранг</th>
                <th className="px-5 py-3">Играч</th>
                <th className="px-5 py-3 text-right">Резултат</th>
                <th className="px-5 py-3 text-right hidden sm:table-cell">Дата</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Зареждане...</td></tr>
              )}
              {!query.isLoading && (query.data?.length ?? 0) === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Все още няма резултати за {getGame(gameSlug)?.title}. Бъди първи!</td></tr>
              )}
              {query.data?.map((r, i) => {
                const profile = r.profiles as { display_name?: string | null; username?: string | null } | null;
                const name = profile?.display_name || profile?.username || "Анонимен";
                return (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-slate-400">#{i + 1}</td>
                    <td className="px-5 py-3 font-semibold text-white">{name}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-brand-secondary">{r.score.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-slate-500 hidden sm:table-cell">
                      {new Date(r.created_at).toLocaleDateString("bg-BG")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
