import { useEffect, useRef } from "react";

type Dir = "up" | "down" | "left" | "right";

export function useSwipe(
  targetRef: React.RefObject<HTMLElement | null>,
  onSwipe: (dir: Dir) => void,
  threshold = 25,
) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY };
    };
    const onMove = (e: TouchEvent) => {
      // prevent page scroll while swiping the play area
      if (startRef.current) e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      const s = startRef.current;
      startRef.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      if (Math.abs(dx) > Math.abs(dy)) onSwipe(dx > 0 ? "right" : "left");
      else onSwipe(dy > 0 ? "down" : "up");
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [targetRef, onSwipe, threshold]);
}

type DPadProps = {
  onDir: (dir: Dir) => void;
  className?: string;
};

const btn =
  "size-14 rounded-xl bg-surface-700 text-white text-2xl font-bold active:bg-brand-primary active:scale-95 transition select-none touch-manipulation flex items-center justify-center border border-white/10";

export function DPad({ onDir, className = "" }: DPadProps) {
  const press = (d: Dir) => (e: React.PointerEvent) => {
    e.preventDefault();
    onDir(d);
  };
  return (
    <div className={`grid grid-cols-3 gap-2 sm:hidden ${className}`}>
      <div />
      <button className={btn} onPointerDown={press("up")} aria-label="Нагоре">↑</button>
      <div />
      <button className={btn} onPointerDown={press("left")} aria-label="Ляво">←</button>
      <button className={btn} onPointerDown={press("down")} aria-label="Долу">↓</button>
      <button className={btn} onPointerDown={press("right")} aria-label="Дясно">→</button>
    </div>
  );
}

type TetrisPadProps = {
  onLeft: () => void;
  onRight: () => void;
  onDown: () => void;
  onRotate: () => void;
  onDrop: () => void;
};

export function TetrisPad({ onLeft, onRight, onDown, onRotate, onDrop }: TetrisPadProps) {
  const wrap = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    fn();
  };
  return (
    <div className="grid grid-cols-3 gap-2 sm:hidden w-full max-w-sm mx-auto">
      <div />
      <button className={btn} onPointerDown={wrap(onRotate)} aria-label="Завърти">⟳</button>
      <div />
      <button className={btn} onPointerDown={wrap(onLeft)} aria-label="Ляво">←</button>
      <button className={btn} onPointerDown={wrap(onDown)} aria-label="Долу">↓</button>
      <button className={btn} onPointerDown={wrap(onRight)} aria-label="Дясно">→</button>
      <div />
      <button
        className="col-span-1 h-14 rounded-xl bg-brand-primary text-white font-bold active:scale-95 transition select-none touch-manipulation border border-white/10"
        onPointerDown={wrap(onDrop)}
        aria-label="Пусни"
      >
        Drop
      </button>
      <div />
    </div>
  );
}
