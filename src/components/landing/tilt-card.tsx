import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Tuile bento avec tilt 3D doux au survol + reflet doré qui suit le curseur.
 * Désactivé proprement sur tactile (pas d'événements souris).
 */
export function TiltCard({
  children,
  className,
  intensity = 8,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), {
    stiffness: 200,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), {
    stiffness: 200,
    damping: 18,
  });
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);

  const onMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_20px_60px_-30px_rgba(12,35,64,0.4)] transition-shadow hover:shadow-[0_30px_80px_-30px_rgba(217,164,0,0.4)]",
        className,
      )}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [glowX, glowY] as never,
            ([gx, gy]: string[]) =>
              `radial-gradient(380px circle at ${gx} ${gy}, rgba(217,164,0,0.22), transparent 60%)`,
          ),
        }}
      />
      <div className="relative" style={{ transform: "translateZ(0)" }}>
        {children}
      </div>
    </motion.div>
  );
}
