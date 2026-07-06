import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoAsset from "@/assets/idm-logo-new.webp.asset.json";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <nav className="border-b border-white/5 bg-surface-900/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <img
              src={logoAsset.url}
              alt="IDMgames лого"
              className="size-12 rounded-full object-cover"
            />
            IDMgames
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link to="/" className="hover:text-white transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-white" }}>
              Игри
            </Link>
            <Link to="/leaderboard" className="hover:text-white transition-colors" activeProps={{ className: "text-white" }}>
              Класация
            </Link>
            <Link to="/community" className="hover:text-white transition-colors" activeProps={{ className: "text-white" }}>
              От потребителите
            </Link>
            <Link to="/about" className="hover:text-white transition-colors" activeProps={{ className: "text-white" }}>
              За нас
            </Link>
            {user && (
              <Link to="/profile" className="hover:text-white transition-colors" activeProps={{ className: "text-white" }}>
                Профил
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-3 pl-2 group">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {user.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-brand-secondary font-mono">ИГРАЧ</p>
                </div>
                <div className="size-10 rounded-full bg-surface-700 border border-white/10 flex items-center justify-center group-hover:border-brand-primary/60 transition-colors">
                  <UserIcon className="size-5 text-slate-300" />
                </div>
              </Link>
              <button
                onClick={signOut}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                aria-label="Изход"
                title="Изход"
              >
                <LogOut className="size-5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
            >
              Вход
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
