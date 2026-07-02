export type Game = {
  slug: string;
  title: string;
  description: string;
  category: string;
  gradient: string;
  status: "live" | "coming_soon";
  route?: string;
};

export const GAMES: Game[] = [
  {
    slug: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    description: "Класическа игра на морски шах срещу умен изкуствен интелект.",
    category: "Стратегия",
    gradient: "from-indigo-500/40 via-indigo-500/10 to-transparent",
    status: "live",
    route: "/games/tic-tac-toe",
  },
  {
    slug: "snake",
    title: "Snake",
    description: "Подобри рефлексите си и порасни до максимален размер.",
    category: "Аркада",
    gradient: "from-emerald-500/40 via-emerald-500/10 to-transparent",
    status: "live",
    route: "/games/snake",
  },
  {
    slug: "2048",
    title: "2048",
    description: "Обединявай числата и достигни заветното 2048.",
    category: "Логика",
    gradient: "from-amber-500/40 via-amber-500/10 to-transparent",
    status: "live",
    route: "/games/2048",
  },
  {
    slug: "sudoku",
    title: "Судоку",
    description: "Четири нива на трудност за истински майстори на числата.",
    category: "Логика",
    gradient: "from-sky-500/40 via-sky-500/10 to-transparent",
    status: "live",
    route: "/games/sudoku",
  },
  {
    slug: "memory",
    title: "Memory",
    description: "Тествай паметта си като откриваш двойки еднакви карти.",
    category: "Памет",
    gradient: "from-pink-500/40 via-pink-500/10 to-transparent",
    status: "live",
    route: "/games/memory",
  },
  {
    slug: "hangman",
    title: "Бесеница",
    description: "Познай думата преди време да свърши.",
    category: "Думи",
    gradient: "from-orange-500/40 via-orange-500/10 to-transparent",
    status: "coming_soon",
  },
  {
    slug: "wordle",
    title: "Познай думата",
    description: "Ежедневно логическо предизвикателство с 6 опита.",
    category: "Думи",
    gradient: "from-lime-500/40 via-lime-500/10 to-transparent",
    status: "coming_soon",
  },
  {
    slug: "word-search",
    title: "Намери думата",
    description: "Намери всички скрити думи в решетката.",
    category: "Думи",
    gradient: "from-teal-500/40 via-teal-500/10 to-transparent",
    status: "coming_soon",
  },
  {
    slug: "tetris",
    title: "Тетрис",
    description: "Класическо подреждане на геометрични фигури.",
    category: "Аркада",
    gradient: "from-violet-500/40 via-violet-500/10 to-transparent",
    status: "coming_soon",
  },
  {
    slug: "sliding-puzzle",
    title: "Нареди числата",
    description: "15-puzzle: подреди плъзгащите числа по ред.",
    category: "Логика",
    gradient: "from-rose-500/40 via-rose-500/10 to-transparent",
    status: "coming_soon",
  },
];

export const getGame = (slug: string) => GAMES.find((g) => g.slug === slug);
