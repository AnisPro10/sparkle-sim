/**
 * Logo vectoriel « L'AZ du Clean » — monogramme AZ géométrique (indépendant des
 * polices), étincelle dorée (la propreté), coup de raclette doré (le geste du
 * métier). Le même dessin existe en fichier autonome `public/logo.svg`,
 * réutilisable sur factures, cartes de visite, flyers et réseaux.
 */

export function BrandMark({
  size = 40,
  className,
  title = "L'AZ du Clean",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id="az-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#16294a" />
          <stop offset="55%" stopColor="#1f3864" />
          <stop offset="100%" stopColor="#0e6e8c" />
        </linearGradient>
      </defs>
      {/* Écusson */}
      <rect x="1" y="1" width="62" height="62" rx="15" fill="url(#az-badge)" />
      <rect
        x="2.25"
        y="2.25"
        width="59.5"
        height="59.5"
        rx="13.75"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.14"
        strokeWidth="1.5"
      />
      {/* Monogramme AZ — paths géométriques (aucune police requise) */}
      <path
        fill="#ffffff"
        fillRule="evenodd"
        d="M11 46 L19.6 18 H26.4 L35 46 H28.4 L26.8 40.2 H19.2 L17.6 46 Z
           M20.9 34.6 L23 26.4 L25.1 34.6 Z"
      />
      <path fill="#ffffff" d="M37 18 H54.6 V23.4 L44.6 40.6 H54.6 V46 H37 V40.6 L47 23.4 H37 Z" />
      {/* Étincelle de propreté */}
      <path
        fill="#d9a400"
        d="M50.5 6.5 L52.4 11.1 L57 13 L52.4 14.9 L50.5 19.5 L48.6 14.9 L44 13 L48.6 11.1 Z"
      />
      <circle cx="58.4" cy="7.6" r="1.5" fill="#d9a400" opacity="0.85" />
      {/* Coup de raclette */}
      <path
        d="M11 52.5 C 24 57.5, 40 57.5, 53 51"
        fill="none"
        stroke="#d9a400"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Logo + nom + slogan, pour les en-têtes et documents. */
export function BrandLockup({
  size = 44,
  light = false,
  withTagline = true,
}: {
  size?: number;
  light?: boolean;
  withTagline?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      <BrandMark size={size} className="shrink-0 drop-shadow-md" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-foreground"}`}
        >
          L'AZ du Clean
        </span>
        {withTagline && (
          <span
            className={`text-[11px] italic ${light ? "text-white/75" : "text-muted-foreground"}`}
          >
            La propreté qui tient parole.
          </span>
        )}
      </span>
    </span>
  );
}
