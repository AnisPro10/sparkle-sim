import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Bouton magnétique : se penche vers le curseur, effet ripple doré au clic.
 * `as` permet d'utiliser un Link en tant qu'enfant. L'attribut data-magnet
 * indique au curseur custom de grossir.
 */
export function MagneticButton({
  children,
  className,
  href,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
}) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set((e.clientX - cx) * 0.25);
    y.set((e.clientY - cy) * 0.35);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const base =
    "group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight transition-colors";
  const variants = {
    primary:
      "bg-[#d9a400] text-[#0c2340] hover:bg-[#f0c14b] shadow-[0_10px_40px_-10px_rgba(217,164,0,0.7)]",
    ghost: "border border-white/30 text-white hover:bg-white/10",
  } as const;

  const inner = (
    <motion.span style={{ x: sx, y: sy }} className="relative z-10 inline-flex items-center gap-2">
      {children}
    </motion.span>
  );

  const decoration = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-0 translate-y-full bg-gradient-to-t from-white/30 to-transparent transition-transform duration-500 group-hover:translate-y-0"
    />
  );

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        data-magnet
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className={cn(base, variants[variant], className)}
      >
        {decoration}
        {inner}
      </motion.a>
    );
  }
  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      data-magnet
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn(base, variants[variant], className)}
    >
      {decoration}
      {inner}
    </motion.button>
  );
}
