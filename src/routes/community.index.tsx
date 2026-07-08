import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyModStatus,
  requestModeratorAccess,
  listApprovedCommunityGames,
} from "@/lib/community.functions";
import { toast } from "sonner";
import { Users, Sparkles, Puzzle, HelpCircle, Calculator, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/community/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "От потребителите — IDMgames" },
      {
        name: "description",
        content:
          "Игри, създадени от одобрени модератори на IDMgames — кръстословици, куизове и Math Sprint предизвикателства.",
      },
      { property: "og:title", content: "От потребителите — IDMgames" },
      {
        property: "og:description",
        content: "Игри, създадени от общността на IDMgames.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

const TYPE_META: Record<string, { label: string; icon: typeof Puzzle; accent: string }> = {
  crossword: { label: "Кръстословица", icon: Puzzle, accent: "text-sky-400" },
  quiz: { label: "Куиз", icon: HelpCircle, accent: "text-amber-400" },
  math_sprint: { label: "Math Sprint", icon: Calculator, accent: "text-emerald-400" },
};

function CommunityPage() {
  const listFn = useServerFn(listApprovedCommunityGames);
  const games = useQuery({
    queryKey: ["community-games-approved"],
    queryFn: () => listFn(),
  });

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center gap-3 mb-2">
          <Users className="size-6 text-brand-secondary" />
          <p className="text-xs font-mono uppercase tracking-widest text-brand-secondary">
            Общност
          </p>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">От потребителите</h1>
        <p className="text-slate-400 max-w-2xl mb-8">
          Игри, създадени от одобрени модератори на IDMgames — кръстословици, куизове и
          Math Sprint предизвикателства.
        </p>

        <ModeratorPanel />

        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4">Публикувани игри</h2>
          {games.isLoading ? (
            <p className="text-slate-500">Зареждане...</p>
          ) : !games.data || games.data.length === 0 ? (
            <div className="bg-surface-800 border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <Sparkles className="size-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                Все още няма публикувани игри от потребителите.
              </p>
              <p className="text-slate-600 text-sm mt-1">
                Първите ще се появят тук, след като модератори ги създадат.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {games.data.map((g) => {
                const meta = TYPE_META[g.game_type] ?? {
                  label: g.game_type,
                  icon: Puzzle,
                  accent: "text-slate-400",
                };
                const Icon = meta.icon;
                return (
                  <Link
                    key={g.id}
                    to="/community/$id"
                    params={{ id: g.id }}
                    className="bg-surface-800 border border-white/5 rounded-2xl p-5 hover:border-brand-primary/40 transition-colors block"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`size-4 ${meta.accent}`} />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        {meta.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-white mb-1">{g.title}</h3>
                    {g.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {g.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">от {g.author_name}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ModeratorPanel() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const statusFn = useServerFn(getMyModStatus);
  const requestFn = useServerFn(requestModeratorAccess);

  const status = useQuery({
    queryKey: ["my-mod-status", user?.id],
    queryFn: () => statusFn(),
    enabled: Boolean(user),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const [message, setMessage] = useState("");
  const requestMut = useMutation({
    mutationFn: () => requestFn({ data: { message } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Заявката е изпратена. Ще получиш достъп след одобрение.");
        setMessage("");
        qc.invalidateQueries({ queryKey: ["my-mod-status"] });
      } else if (res.reason === "already_pending") {
        toast.error("Вече имаш чакаща заявка.");
      }
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Грешка";
      toast.error(msg);
    },
  });

  if (loading) return null;

  if (!user) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-bold text-white">Искаш да създаваш игри?</p>
          <p className="text-sm text-slate-400">
            Влез в профила си и подай заявка за модераторски достъп.
          </p>
        </div>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90"
        >
          Вход
        </Link>
      </div>
    );
  }

  const latest = status.data?.requests?.[0];

  if (status.data?.isModerator) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <p className="font-bold text-white">
              Ти си {status.data.isAdmin ? "админ" : "модератор"}
            </p>
          </div>
          <p className="text-sm text-slate-300">
            Създавай кръстословици, куизове и Math Sprint игри с помощта на AI.
          </p>
        </div>
        <Link
          to="/moderator"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 shrink-0"
        >
          <Sparkles className="size-4" />
          Създай игра
        </Link>
      </div>
    );
  }

  if (latest?.status === "pending") {
    return (
      <div className="bg-surface-800 border border-amber-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="size-5 text-amber-400" />
          <p className="font-bold text-white">Заявката ти чака одобрение</p>
        </div>
        <p className="text-sm text-slate-400">
          Изпратена на {new Date(latest.created_at).toLocaleString("bg-BG")}. Ще получиш
          достъп веднага след като админ я одобри.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-800 border border-white/5 rounded-2xl p-6">
      <p className="font-bold text-white mb-1">Стани модератор</p>
      <p className="text-sm text-slate-400 mb-4">
        Одобрените модератори могат да създават кръстословици, куизове и Math Sprint игри,
        които се публикуват тук след админ одобрение.
      </p>
      {latest?.status === "rejected" && (
        <div className="mb-4 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <XCircle className="size-4 mt-0.5 shrink-0" />
          <span>Предишната ти заявка беше отхвърлена. Може да подадеш нова.</span>
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 500))}
        placeholder="Кратко представяне (по избор): защо искаш да си модератор?"
        rows={3}
        className="w-full px-4 py-3 rounded-lg bg-surface-900 border border-white/10 text-white placeholder:text-slate-600 focus:border-brand-primary focus:outline-none text-sm resize-none"
      />
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-slate-600 font-mono">{message.length}/500</p>
        <button
          onClick={() => requestMut.mutate()}
          disabled={requestMut.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {requestMut.isPending ? "Изпращане..." : "Заявка за модератор"}
        </button>
      </div>
    </div>
  );
}
