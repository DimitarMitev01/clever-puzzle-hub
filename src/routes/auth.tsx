import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход или регистрация — IDMgames" },
      { name: "description", content: "Влез или създай профил в IDMgames, за да следиш резултатите си." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Невалиден имейл").max(255);
const passwordSchema = z.string().min(6, "Мин. 6 символа").max(72);

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedError, setUnverifiedError] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/profile" });
  }, [user, navigate]);

  useEffect(() => {
    setUnverifiedError(false);
  }, [email, password, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ep = emailSchema.safeParse(email);
    const pp = passwordSchema.safeParse(password);
    if (!ep.success) return toast.error(ep.error.issues[0].message);
    if (!pp.success) return toast.error(pp.error.issues[0].message);

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: ep.data,
          password: pp.data,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Профилът е създаден!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: ep.data,
          password: pp.data,
        });
        if (error) throw error;
        toast.success("Добре дошъл!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Възникна грешка";
      const isUnverified =
        /email not confirmed|not confirmed|unverified|потвърден|verified/i.test(msg);
      setUnverifiedError(isUnverified);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google вход неуспешен");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="size-9 bg-brand-primary rounded-lg flex items-center justify-center text-xs font-bold text-white">
            IDM
          </span>
          <span className="text-xl font-bold">IDMgames</span>
        </Link>

        <div className="bg-surface-800 border border-white/5 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {mode === "signin" ? "Влез в профила си" : "Създай нов профил"}
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            {mode === "signin"
              ? "Влез, за да продължиш напредъка си."
              : "Регистрирай се, за да пазиш резултатите си."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full mb-4 flex items-center justify-center gap-3 py-2.5 rounded-lg bg-white text-surface-900 font-semibold hover:bg-slate-100 transition disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
            </svg>
            Продължи с Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">или</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Имейл</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-surface-900 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:border-brand-primary focus:outline-none transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Парола</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-surface-900 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:border-brand-primary focus:outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90 transition disabled:opacity-50"
            >
              {loading ? "Изчакай..." : mode === "signin" ? "Вход" : "Регистрация"}
            </button>
            {mode === "signin" && unverifiedError && (
              <p className="text-center text-xs text-amber-400 mt-2">
                Проверете spam папката.
              </p>
            )}
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            {mode === "signin" ? "Нямаш профил?" : "Вече имаш профил?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-brand-primary font-semibold hover:underline"
            >
              {mode === "signin" ? "Регистрирай се" : "Влез"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link to="/" className="hover:text-slate-300">← Обратно към началото</Link>
        </p>
      </div>
    </div>
  );
}
