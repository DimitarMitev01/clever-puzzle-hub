import logoAsset from "@/assets/idm-logo.png.asset.json";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 py-12 bg-surface-900">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <img src={logoAsset.url} alt="IDMgames" className="size-8 rounded-md object-cover" />
          © {new Date().getFullYear()} IDMgames. Всички права запазени.
        </div>
        <div className="flex gap-8 text-sm font-medium text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Условия</a>
          <a href="#" className="hover:text-white transition-colors">Поверителност</a>
          <a href="#" className="hover:text-white transition-colors">Контакт</a>
        </div>
      </div>
    </footer>
  );
}
