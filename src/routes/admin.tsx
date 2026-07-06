import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GAMES, getGame } from "@/lib/games";
import {
  isAdminUnlocked,
  unlockAdmin,
  lockAdmin,
  adminStats,
  adminListUsers,
  adminListScores,
  adminDeleteScore,
  adminDeleteUser,
} from "@/lib/admin.functions";
import {
  adminListModRequests,
  adminReviewModRequest,
  adminListPendingGames,
  adminReviewGame,
} from "@/lib/community.functions";
import { Shield, Trash2, Lock, LogOut, Check, X, Clock } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Админ панел — IDMgames" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const check = useServerFn(isAdminUnlocked);
  const gate = useQuery({ queryKey: ["admin-unlocked"], queryFn: () => check() });

  if (gate.isLoading) {
    return <Shell><p className="text-slate-400">Проверка...</p></Shell>;
  }
  if (!gate.data?.unlocked) {
    return <LockScreen onUnlocked={() => gate.refetch()} />;
  }
  return <AdminContent />;
}

function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const unlock = useServerFn(unlockAdmin);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await unlock({ data: { password } });
      if (res.ok) {
        setPassword("");
        onUnlocked();
      } else {
        setError("Грешна парола.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Грешка");
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell>
      <div className="max-w-md mx-auto mt-16 bg-surface-800 border border-white/5 rounded-2xl p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-14 rounded-full bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center mb-4">
            <Lock className="size-6 text-brand-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Защитена зона</h1>
          <p className="text-sm text-slate-400">Въведи админ паролата, за да продължиш.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Парола"
            className="w-full px-4 py-3 rounded-lg bg-surface-900 border border-white/10 text-white placeholder:text-slate-600 focus:border-brand-primary focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending || !password}
            className="w-full px-5 py-3 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {pending ? "Проверка..." : "Отключи"}
          </button>
        </form>
      </div>
    </Shell>
  );
}

function AdminContent() {
  const qc = useQueryClient();
  const getStats = useServerFn(adminStats);
  const getUsers = useServerFn(adminListUsers);
  const getScores = useServerFn(adminListScores);
  const deleteScore = useServerFn(adminDeleteScore);
  const deleteUser = useServerFn(adminDeleteUser);
  const lockFn = useServerFn(lockAdmin);

  const listModReqs = useServerFn(adminListModRequests);
  const reviewModReq = useServerFn(adminReviewModRequest);
  const listPendingGames = useServerFn(adminListPendingGames);
  const reviewGame = useServerFn(adminReviewGame);

  const [tab, setTab] = useState<"stats" | "users" | "scores" | "requests" | "games">("stats");
  const [gameFilter, setGameFilter] = useState<string>("");

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => getStats() });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => getUsers(), enabled: tab === "users" });
  const scores = useQuery({
    queryKey: ["admin-scores", gameFilter],
    queryFn: () => getScores({ data: { gameSlug: gameFilter || null } }),
    enabled: tab === "scores",
  });
  const modReqs = useQuery({
    queryKey: ["admin-mod-requests"],
    queryFn: () => listModReqs(),
    enabled: tab === "requests",
  });
  const pendingGames = useQuery({
    queryKey: ["admin-pending-games"],
    queryFn: () => listPendingGames(),
    enabled: tab === "games",
  });

  const reviewModMut = useMutation({
    mutationFn: (v: { id: string; action: "approve" | "reject" }) => reviewModReq({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mod-requests"] }),
  });
  const reviewGameMut = useMutation({
    mutationFn: (v: { id: string; action: "approve" | "reject" | "delete"; reason?: string | null }) =>
      reviewGame({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pending-games"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteScore({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scores"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const delUserMut = useMutation({
    mutationFn: (id: string) => deleteUser({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-scores"] });
    },
  });


  return (
    <Shell>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Shield className="size-6 text-brand-secondary" />
          <p className="text-xs font-mono uppercase tracking-widest text-brand-secondary">Управление</p>
        </div>
        <button
          onClick={async () => {
            await lockFn();
            qc.invalidateQueries({ queryKey: ["admin-unlocked"] });
          }}
          className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:border-red-500/40 hover:text-red-400"
        >
          <LogOut className="size-3" /> Заключи
        </button>
      </div>
      <h1 className="text-4xl font-bold text-white mb-8">Админ панел</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["stats", "users", "scores", "requests", "games"] as const).map((t) => {
          const labels: Record<typeof t, string> = {
            stats: "Статистика",
            users: "Потребители",
            scores: "Резултати",
            requests: "Заявки за модератор",
            games: "Игри от общността",
          };
          const pendingBadge =
            t === "requests"
              ? modReqs.data?.filter((r) => r.status === "pending").length ?? 0
              : t === "games"
                ? pendingGames.data?.filter((g) => g.status === "pending").length ?? 0
                : 0;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border inline-flex items-center gap-2 ${
                tab === t
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-surface-800 text-slate-300 border-white/10 hover:border-brand-primary/40"
              }`}
            >
              {labels[t]}
              {pendingBadge > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "stats" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Metric label="Посетители (общо)" value={stats.data?.visits ?? 0} />
            <Metric label="Уникални посетители" value={stats.data?.uniqueVisitors ?? 0} />
            <Metric label="Посещения (24ч)" value={stats.data?.visitsToday ?? 0} />
            <Metric label="Потребители" value={stats.data?.users ?? 0} />
            <Metric label="Записани резултати" value={stats.data?.scores ?? 0} />
            <Metric label="Активни игри" value={GAMES.filter((g) => g.status === "live").length} />
          </div>
          <div className="bg-surface-800 rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3">Игра</th>
                  <th className="px-5 py-3 text-right">Изигравания</th>
                  <th className="px-5 py-3 text-right">Топ резултат</th>
                </tr>
              </thead>
              <tbody>
                {GAMES.filter((g) => g.status === "live").map((g) => {
                  const row = stats.data?.byGame?.[g.slug];
                  return (
                    <tr key={g.slug} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 font-semibold text-white">{g.title}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-300">{row?.plays ?? 0}</td>
                      <td className="px-5 py-3 text-right font-mono text-brand-secondary">{row?.top ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="bg-surface-800 rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-mono">
              <tr className="border-b border-white/5">
                <th className="px-5 py-3">Играч</th>
                <th className="px-5 py-3 text-right">Игри</th>
                <th className="px-5 py-3 hidden md:table-cell">Регистрация</th>
                <th className="px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.isLoading && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">Зареждане...</td></tr>}
              {users.data?.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-white">{u.display_name || u.username || "—"}</p>
                    <p className="text-xs text-slate-500 font-mono">{u.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">{u.plays}</td>
                  <td className="px-5 py-3 hidden md:table-cell text-slate-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString("bg-BG")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => {
                        const name = u.display_name || u.username || u.id.slice(0, 8);
                        if (confirm(`Изтриване на профил "${name}"? Действието е необратимо и ще изтрие всички резултати.`)) {
                          delUserMut.mutate(u.id);
                        }
                      }}
                      disabled={delUserMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      Изтрий
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

      {tab === "scores" && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setGameFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                !gameFilter ? "bg-brand-primary text-white border-brand-primary" : "bg-surface-800 text-slate-300 border-white/10"
              }`}
            >
              Всички
            </button>
            {GAMES.filter((g) => g.status === "live").map((g) => (
              <button
                key={g.slug}
                onClick={() => setGameFilter(g.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  gameFilter === g.slug ? "bg-brand-primary text-white border-brand-primary" : "bg-surface-800 text-slate-300 border-white/10"
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
                  <th className="px-5 py-3">Игра</th>
                  <th className="px-5 py-3 text-right">Резултат</th>
                  <th className="px-5 py-3 text-right">Време</th>
                  <th className="px-5 py-3 hidden md:table-cell">Играч</th>
                  <th className="px-5 py-3 hidden md:table-cell">Дата</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {scores.isLoading && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">Зареждане...</td></tr>}
                {scores.data?.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-semibold text-white">{getGame(s.game_slug)?.title ?? s.game_slug}</td>
                    <td className="px-5 py-3 text-right font-mono text-brand-secondary">{s.score}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-400">{s.duration_seconds}s</td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs font-mono text-slate-500">{s.user_id.slice(0, 8)}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-slate-500 text-xs">
                      {new Date(s.created_at).toLocaleString("bg-BG")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          if (!confirm("Изтрий този резултат?")) return;
                          delMut.mutate(s.id);
                        }}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                        aria-label="Изтрий"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="text-4xl font-bold text-white font-mono">{value.toLocaleString()}</p>
    </div>
  );
}
