import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function getInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("idm-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const t = getInitial();
    setTheme(t);
    apply(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    localStorage.setItem("idm-theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 text-slate-400 hover:text-white transition-colors"
      aria-label={theme === "dark" ? "Светла тема" : "Тъмна тема"}
      title={theme === "dark" ? "Светла тема" : "Тъмна тема"}
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
