
# Refonte de la landing page — L'AZ du Clean

Direction validée : **bleu canard & or** (marque actuelle), **Space Grotesk + DM Sans**, **bento grid**, ambiance **spectaculaire**. Seule la page d'accueil (`/`) change — le simulateur et ses 10 écrans restent intacts.

## Esprit visuel

Style "studio créatif" type Awwwards, sur le thème de l'eau et de la lumière (la propreté). Mouvement permanent mais contrôlé, beaucoup d'or sur fond marine, typographie XXL, ratio visuel/texte élevé.

## Structure (bento grid)

```text
┌─────────────────────────────────────────────────────┐
│  HERO plein écran — fond marine animé              │
│  Titre XXL "La propreté qui tient parole."         │
│  Curseur magnétique + halo lumineux qui suit       │
│  Particules / bulles flottantes (SVG, GPU)         │
└─────────────────────────────────────────────────────┘
┌──────────────┬──────────┬───────────────────────────┐
│ Tuile XL     │ KPI vif  │ Marquee logos secteurs   │
│ "Avant/Après"│ CA an 1  │ (Bureaux · Vitrerie ...) │
│ slider photo │ animé    │                           │
├──────────────┼──────────┴───────────────────────────┤
│ Tuile carrée │ Tuile large — Charte des 4 engagts  │
│ Vidéo loop   │ icônes animées au hover             │
│ raclette/eau │                                      │
├──────────────┴──────────────┬───────────────────────┤
│ 4 activités (cartes hover)   │ Tuile CTA simulateur │
│ Bureaux/Vitres/Airbnb/Privé  │ gradient + flèche    │
├──────────────────────────────┴───────────────────────┤
│ Bandeau citation + signature artisan                 │
└──────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ FOOTER marine — logo, contact, liens simulateur    │
└─────────────────────────────────────────────────────┘
```

## Interactions clés

- **Curseur personnalisé** : point doré + halo flou qui suit la souris (spring physics via `framer-motion`), effet "magnétique" sur boutons et tuiles (le curseur s'accroche, la tuile se penche légèrement en 3D).
- **Boutons interactifs** : remplissage doré au hover avec masque circulaire qui s'étend depuis le curseur, micro-press sur clic.
- **Tuiles bento** : tilt 3D au survol (max 6°), bordure dorée qui s'illumine, ombre portée colorée.
- **Reveal au scroll** : chaque tuile entre avec fade-up + clip-path (effet "essuyage de vitre" doré).
- **Marquee logos / activités** : défilement horizontal infini, pause au hover.
- **Compteurs animés** : KPI live (CA, net, croisière) déjà branchés sur le simulateur, animés à l'entrée dans le viewport.
- **Avant/Après** : slider draggable sur une photo de surface sale → propre (générée).
- **Vidéo / loop visuel** : courte boucle SVG animée (raclette + bulles + reflet) au lieu d'une vraie vidéo lourde.
- **Respect `prefers-reduced-motion`** : tout est désactivé proprement.

## Assets visuels

- **2 images générées** (qualité `standard`) :
  1. `src/assets/landing-before-after.jpg` — split surface vitrée sale/propre (slider).
  2. `src/assets/landing-bureau.jpg` — bureau impeccable baigné de lumière (tuile hero secondaire).
- **Pictogrammes/illustrations vectorielles** custom (raclette, bulle, étincelle, vague) — SVG inline, animés en CSS.
- Le logo existant `BrandMark` est réutilisé tel quel.

## Détails techniques

- **Fichier** : `src/routes/index.tsx` réécrit intégralement (page d'accueil uniquement). Métadonnées SEO / JSON-LD `LocalBusiness` actuels préservés.
- **Nouveaux composants** dans `src/components/landing/` :
  - `magnetic-cursor.tsx` — curseur custom, spring physics.
  - `magnetic-button.tsx` — wrapper avec attraction + ripple doré.
  - `tilt-card.tsx` — tilt 3D générique pour les tuiles bento.
  - `bubble-field.tsx` — particules SVG (bulles d'eau) GPU-animées.
  - `before-after.tsx` — slider draggable.
  - `marquee.tsx` — défilement horizontal infini.
- **Dépendance ajoutée** : `framer-motion` (animations physics, déjà standard sur ce type de site).
- **Tokens couleurs** : on réutilise `--primary`, `--gold`, `--gradient-primary` déjà définis. Aucun token rouge/violet ajouté.
- **Typographie** : on ajoute `Space Grotesk` + `DM Sans` via `<link>` dans `__root.tsx`, et on les map à `--font-display` / `--font-sans` dans `styles.css` (les autres écrans héritent — cohérence renforcée, aucun écran cassé).
- **Curseur custom** : caché sur mobile/tactile et si `prefers-reduced-motion`, sinon `cursor: none` sur le body de la landing uniquement (scopé à la route `/`).
- **Performance** : animations en `transform`/`opacity`, `will-change` ciblé, images en `loading="lazy"` sauf hero, pas de librairie de particules lourde.

## Vérifications après build

1. La home charge sans erreur console, le curseur custom apparaît au desktop, disparaît au tactile.
2. Les 10 écrans du simulateur (sidebar) restent visuellement identiques.
3. Les CTA "Lancer la simulation" / "Voir le rapport" pointent toujours vers `/demarrage` et `/rapport`.
4. Métadonnées SEO et JSON-LD inchangées (titre, description, OG, LocalBusiness).
5. `prefers-reduced-motion` : pas de curseur custom, pas de tilt, pas de marquee — le contenu reste lisible.

## Hors-scope

- Aucune modification du moteur financier, des routes du simulateur, ou des composants `simulator/*`.
- Aucun changement de palette globale ni de tokens existants.
- Pas de vidéo MP4 lourde — uniquement SVG/CSS animés.
