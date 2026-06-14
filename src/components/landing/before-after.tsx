import { useRef, useState, useCallback, useEffect } from "react";
import beforeAfter from "@/assets/landing-before-after.jpg";

/**
 * Comparateur avant/après : poignée draggable au centre.
 * L'image source est déjà un split sale/propre, on révèle la moitié propre
 * à droite avec un clip-path qui suit la position du curseur / doigt.
 */
export function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setPos(p);
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragging.current) update(e.clientX);
    };
    const up = () => (dragging.current = false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [update]);

  return (
    <div
      ref={ref}
      className="relative h-full w-full select-none overflow-hidden"
      onPointerDown={(e) => {
        dragging.current = true;
        update(e.clientX);
      }}
    >
      {/* AVANT (sale) — image complète en fond */}
      <img
        src={beforeAfter}
        alt="Vitre sale avant intervention"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      {/* APRÈS (propre) — moitié droite de l'image, dévoilée par clip */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        <img
          src={beforeAfter}
          alt="Vitre propre après intervention"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "100% center" }}
          loading="lazy"
        />
      </div>
      {/* Labels */}
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
        Avant
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-[#d9a400] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0c2340]">
        Après
      </span>
      {/* Poignée */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_20px_rgba(255,255,255,0.7)]"
        style={{ left: `${pos}%` }}
      >
        <div
          data-magnet
          className="absolute top-1/2 left-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-[#d9a400] text-[#0c2340] shadow-xl active:cursor-grabbing"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6L3 12l6 6M15 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
