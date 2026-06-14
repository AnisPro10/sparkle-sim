import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Curseur magnétique : un point doré + un grand halo flou suivent la souris.
 * Désactivé sur tactile et si prefers-reduced-motion.
 * Le halo grossit au survol d'un élément interactif (a, button, [data-magnet]).
 */
export function MagneticCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });
  const hx = useSpring(x, { stiffness: 120, damping: 18, mass: 0.6 });
  const hy = useSpring(y, { stiffness: 120, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.documentElement.classList.add("az-cursor-on");
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      setHovering(!!t?.closest("a,button,[data-magnet],input,textarea,select"));
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    return () => {
      document.documentElement.classList.remove("az-cursor-on");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, [x, y]);

  if (!enabled) return null;
  return (
    <>
      <motion.div
        aria-hidden
        style={{ x: hx, y: hy }}
        className="pointer-events-none fixed left-0 top-0 z-[9998] -ml-32 -mt-32 h-64 w-64 rounded-full"
      >
        <motion.div
          animate={{ scale: hovering ? 1.4 : 1, opacity: hovering ? 0.55 : 0.32 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="h-full w-full rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #d9a400 0%, transparent 65%)" }}
        />
      </motion.div>
      <motion.div
        aria-hidden
        style={{ x: sx, y: sy }}
        className="pointer-events-none fixed left-0 top-0 z-[9999] -ml-1.5 -mt-1.5"
      >
        <motion.div
          animate={{ scale: hovering ? 2.2 : 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className="h-3 w-3 rounded-full bg-[#d9a400] shadow-[0_0_18px_4px_rgba(217,164,0,0.7)]"
        />
      </motion.div>
    </>
  );
}
