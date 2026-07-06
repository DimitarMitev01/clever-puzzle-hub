import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/idm-logo-new.webp.asset.json";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.89 2.89 2.89 0 0 1 2.88-2.89c.3 0 .59.05.86.13V9.2a6.33 6.33 0 0 0-.86-.06A6.34 6.34 0 0 0 2 15.47a6.34 6.34 0 0 0 6.33 6.34c3.5 0 6.33-2.82 6.33-6.33V8.83a8.29 8.29 0 0 0 4.93 1.61V6.69h-3z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.25-.15-4.77-1.69-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.18 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 2.7.22.21 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.15 4.36 2.62 6.83 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.15 6.83-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.15-4.35-2.62-6.83-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 py-12 bg-surface-900">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <img src={logoAsset.url} alt="IDMgames" className="size-10 rounded-full object-cover" />
          © {new Date().getFullYear()} IDMgames. Всички права запазени.
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-3">
            <a
              href="https://www.tiktok.com/@idmgames?is_from_webapp=1&sender_device=pc"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-primary/50 hover:bg-surface-700 transition-all"
              aria-label="TikTok"
            >
              <TikTokIcon className="size-4" />
            </a>
            <a
              href="https://www.instagram.com/idmgames/"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-primary/50 hover:bg-surface-700 transition-all"
              aria-label="Instagram"
            >
              <InstagramIcon className="size-4" />
            </a>
            <a
              href="https://www.facebook.com/people/IDMgames/61591599240849/?locale=bg_BG"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-primary/50 hover:bg-surface-700 transition-all"
              aria-label="Facebook"
            >
              <FacebookIcon className="size-4" />
            </a>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-400">
            <Link to="/about" className="hover:text-white transition-colors">За нас</Link>
            <a href="#" className="hover:text-white transition-colors">Условия</a>
            <a href="#" className="hover:text-white transition-colors">Поверителност</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
