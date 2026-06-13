// Budget formalités certifié (phase 8 de l'étude, audit du 12/06/2026).
// Source unique : consommé par la page Démarrage ET le Rapport imprimable —
// modifier un poste ici met à jour les deux (le total n'est jamais codé en dur).
export const FORMALITY_BUDGET = [
  { label: "Taxe de première délivrance du titre de séjour (depuis le 01/05/2026)", amount: 350 },
  { label: "Immatriculation INPI — guichet unique, micro 81.21Z", amount: 0 },
  { label: "RC pro (~180 €/an) + avenant véhicule usage pro (~150 €/an)", amount: 330 },
  { label: "Impression plaquettes ×250 + cartes de visite ×250", amount: 65 },
  { label: "Recommandés, photos d'identité, divers", amount: 40 },
] as const;

export const FORMALITY_TOTAL = FORMALITY_BUDGET.reduce((s, p) => s + p.amount, 0); // 785 €
