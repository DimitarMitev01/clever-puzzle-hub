import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export function GameShell({
  title,
  category,
  description,
  children,
  sidebar,
}: {
  title: string;
  category: string;
  description: string;
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="size-4" /> Всички игри
        </Link>

        <div className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-brand-secondary mb-2">
            {category}
          </p>
          <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
          <p className="text-slate-400 max-w-2xl">{description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          <div className="bg-surface-800 rounded-2xl border border-white/5 p-6">{children}</div>
          {sidebar && <aside className="space-y-4">{sidebar}</aside>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
