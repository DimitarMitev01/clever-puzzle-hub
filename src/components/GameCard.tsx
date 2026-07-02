import { Link } from "@tanstack/react-router";
import type { Game } from "@/lib/games";

function GameThumb({ game }: { game: Game }) {
  const initials = game.title.slice(0, 2).toUpperCase();
  return (
    <div className={`w-full h-full bg-gradient-to-br ${game.gradient} bg-surface-700 flex items-center justify-center`}>
      <span className="text-5xl font-black text-white/90 font-mono tracking-tighter">{initials}</span>
    </div>
  );
}

export function GameCard({ game }: { game: Game }) {
  const disabled = game.status === "coming_soon";
  const inner = (
    <div className="group bg-surface-800 rounded-2xl border border-white/5 overflow-hidden hover:border-brand-primary/50 transition-all h-full flex flex-col">
      <div className="aspect-video relative overflow-hidden">
        <GameThumb game={game} />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-900/80 to-transparent" />
        {disabled && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-slate-200 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">
            Скоро
          </span>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-[10px] font-mono uppercase tracking-wider text-brand-secondary mb-1">
          {game.category}
        </p>
        <h3 className="text-lg font-bold text-white mb-1">{game.title}</h3>
        <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-1">{game.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">
            {disabled ? "Не е налична" : "Готова за игра"}
          </span>
          <span className={`text-xs font-bold ${disabled ? "text-slate-600" : "text-brand-primary group-hover:underline"}`}>
            {disabled ? "—" : "ИГРАЙ →"}
          </span>
        </div>
      </div>
    </div>
  );

  if (disabled || !game.route) {
    return <div className="opacity-70 cursor-not-allowed">{inner}</div>;
  }
  return (
    <Link to={game.route} className="block h-full">
      {inner}
    </Link>
  );
}
