import { useMemo } from "react";

/**
 * Champ de bulles flottantes en SVG — thème "eau & propreté".
 * Animation pure CSS (transform/opacity), GPU-friendly.
 */
export function BubbleField({ count = 18 }: { count?: number }) {
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Pseudo-random déterministe pour éviter mismatch SSR.
        const seed = (i + 1) * 9301;
        const rnd = (n: number) => ((seed * n) % 1000) / 1000;
        return {
          left: rnd(7) * 100,
          size: 10 + rnd(13) * 38,
          delay: rnd(23) * 14,
          duration: 14 + rnd(31) * 16,
          opacity: 0.18 + rnd(41) * 0.28,
        };
      }),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="az-bubble absolute bottom-[-10%] rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            opacity: b.opacity,
            animationDelay: `-${b.delay}s`,
            animationDuration: `${b.duration}s`,
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85), rgba(173,221,232,0.25) 60%, transparent 70%)",
            boxShadow: "inset 0 0 8px rgba(255,255,255,0.4)",
          }}
        />
      ))}
    </div>
  );
}
