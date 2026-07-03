import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GAMES, getGame } from "@/lib/games";
import {
  isAdmin,
  claimFirstAdmin,
  adminStats,
  adminListUsers,
  adminListScores,
  adminDeleteScore,
  adminSetRole,
} from "@/lib/admin.functions";
import { Shield, Trash2, Crown, UserX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Админ панел — IDMgames" }] }),
  beforeLoad: async ({ context }) => {
    if (!context.user) throw redirect({ to: "/auth" });
  },
  component: AdminPage,
});

function AdminPage() {
  const check = useServerFn(isAdmin);
  const claim = useServerFn(claimFirstAdmin);
  const gate = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });

  if (gate.isLoading) {
    return <Shell><p className="text-slate-400">Проверка...</p></Shell>;
  }
  if (!gate.data?.admin) {
    return (
      <Shell>
        <div className="bg-surface-800 border border-white/5 rounded-2xl p-8 text-center">
          <Shield className="size-10 text-slate-500 mx-auto mb-4" />
          <p className="text-white font-bold mb-2">Нямаш достъп до админ панела.</p>
          <p className="text-sm text-slate-400 mb-6">Ако си собственик на платформата и все още няма администратор, поеми ролята.</p>
          <button
            onClick={async () => {
              try {
                await claim();
                gate.refetch();
              } catch (e: any) {
                alert(e?.message ?? "Грешка");
              }
            }}
            className="px-5 py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90"
          >
            Стани първи администратор
          </button>
        </div>
      </Shell>
    );
  }

  return <AdminContent />;
}

function AdminContent() {
  const qc = useQueryClient();
  const getStats = useServerFn(adminStats);
  const getUsers = useServerFn(adminListUsers);
  const getScores = useServerFn(adminListScores);
  const deleteScore = useServerFn(adminDeleteScore);
  const setRole = useServerFn(adminSetRole);

  const [tab, setTab] = useState<"stats" | "users" | "scores">("stats");
  const [gameFilter, setGameFilter] = useState<string>("");

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => getStats() });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => getUsers(), enabled: tab === "users" });
  const scores = useQuery({
    queryKey: ["admin-scores", gameFilter],
    queryFn: () => getScores({ data: { gameSlug: gameFilter || null } }),
    enabled: tab === "scores",
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteScore({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scores"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "user"; grant: boolean }) => setRole({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <Shell>
      <div className="flex items-center gap-3 mb-2">
        <Shield className="size-6 text-brand-secondary" />
        <p className="text-xs font-mono uppercase tracking-widest text-brand-secondary">Управление</p>
      </div>
      <h1 className="text-4xl font-bold text-white mb-8">Админ панел</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["stats", "users", "scores"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border ${
              tab === t
                ? "bg-brand-primary text-white border-brand-primary"
                : "bg-surface-800 text-slate-300 border-white/10 hover:border-brand-primary/40"
            }`}
          >
            {t === "stats" ? "Статистика" : t === "users" ? "Потребители" : "Резултати"}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <th className="px-5 py-3">Роли</th>
                <th className="px-5 py-3 text-right">Игри</th>
                <th className="px-5 py-3 hidden md:table-cell">Регистрация</th>
                <th className="px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Зареждане...</td></tr>}
              {users.data?.map((u) => {
                const admin = u.roles.includes("admin");
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-white">{u.display_name || u.username || "—"}</p>
                      <p className="text-xs text-slate-500 font-mono">{u.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-3">
                      {admin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-secondary">
                          <Crown className="size-3" /> ADMIN
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">player</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-300">{u.plays}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-slate-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString("bg-BG")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          if (admin && !confirm("Премахни admin от този потребител?")) return;
                          roleMut.mutate({ userId: u.id, role: "admin", grant: !admin });
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                          admin
                            ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                            : "border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10"
                        }`}
                      >
                        {admin ? (
                          <span className="inline-flex items-center gap-1"><UserX className="size-3" />Отнеми</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><Crown className="size-3" />Направи admin</span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
