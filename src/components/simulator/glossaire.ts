// Glossaire partagé : alimente la page /dictionnaire ET les infobulles du simulateur.
// Même esprit que l'onglet Dictionnaire du prévisionnel Excel certifié.
export type Categorie =
  | "Finance"
  | "Fiscalité"
  | "Juridique"
  | "Aides & social"
  | "Métier propreté"
  | "Stratégie";
export type Terme = { mot: string; cat: Categorie; def: string; exemple?: string };

export const TERMES: Terme[] = [
  // Finance
  {
    mot: "Chiffre d'affaires (CA)",
    cat: "Finance",
    def: "Tout l'argent facturé aux clients sur l'année, avant de retirer la moindre dépense.",
    exemple:
      "Plan officiel année 1 : 36 573 € (B2B 21 786 + Airbnb 6 075 + particuliers 7 560 + vitrerie 1 152).",
  },
  {
    mot: "Net de gestion",
    cat: "Finance",
    def: "Ce qui reste chaque mois après prélèvements sociaux et fiscaux, charges variables et charges fixes — avant le matériel initial.",
    exemple: "Janvier 2027 : CA 2 730 € × 67,8 % − 75 € = 1 776 € nets.",
  },
  {
    mot: "Net réel",
    cat: "Finance",
    def: "Le vrai revenu de l'année complète, une fois TOUT payé : cotisations, impôt, produits, déplacements, fixes et matériel initial.",
    exemple: "Année 1 officielle : 22 697 €, soit 1 891 €/mois en moyenne.",
  },
  {
    mot: "Contribution (par activité)",
    cat: "Finance",
    def: "Ce qu'une activité rapporte vraiment après ses propres prélèvements et charges variables. Permet de voir quelle activité « paie » les charges fixes.",
    exemple: "Année 1 : B2B 14 772 € · particuliers 5 125 € · Airbnb 4 119 € · vitrerie 781 €.",
  },
  {
    mot: "Charges fixes",
    cat: "Finance",
    def: "Dépenses qui tombent tous les mois même sans aucune prestation : RC pro, véhicule, téléphone, logiciel de facturation, banque.",
    exemple: "75 €/mois en officiel (15+12+15+25+8), 95 €/mois en réaliste terrain.",
  },
  {
    mot: "Charges variables",
    cat: "Finance",
    def: "Dépenses proportionnelles à l'activité : produits d'entretien (4 % du CA) et déplacements (5 %). Plus on facture, plus elles montent.",
    exemple:
      "9 % du CA en officiel ; 12 % en réaliste terrain (produits 5,5 % + déplacements 6,5 %).",
  },
  {
    mot: "Point mort",
    cat: "Finance",
    def: "Le volume d'activité qui couvre juste les charges fixes. En dessous on perd, au-dessus chaque heure rapporte.",
    exemple: "75 € de fixes ÷ 20,34 € de marge horaire ≈ 4 heures facturées par mois.",
  },
  {
    mot: "Trésorerie",
    cat: "Finance",
    def: "L'argent réellement disponible sur le compte à un instant donné. On peut être rentable sur le papier et à sec en caisse à cause des paiements à 30 jours.",
  },
  {
    mot: "Point bas de trésorerie",
    cat: "Finance",
    def: "Le moment de l'année où le compte est au plus bas. C'est lui qui dimensionne l'apport nécessaire, pas le total annuel.",
    exemple: "Plan officiel : +921 € en septembre 2026 (premier mois, rien d'encaissé en B2B).",
  },
  {
    mot: "BFR",
    cat: "Finance",
    def: "Besoin en fonds de roulement : l'argent immobilisé par le décalage entre la prestation (facturée) et son encaissement à 30 jours.",
    exemple: "Fin août 2027 : 2 414 € facturés en B2B/vitrerie, encaissés seulement en septembre.",
  },
  {
    mot: "CAPEX (matériel initial)",
    cat: "Finance",
    def: "L'investissement de départ payé au premier mois : aspirateur professionnel, monobrosse, kit vitrerie, consommables.",
    exemple: "1 200 € au mois 1 — c'est lui qui creuse le point bas de septembre.",
  },
  {
    mot: "Net de croisière",
    cat: "Finance",
    def: "Le rythme mensuel atteint une fois l'activité installée : moyenne des nets de gestion de juin à août 2027, saisonnalité comprise.",
    exemple: "2 948 €/mois en officiel — l'objectif de 1 500 € est dépassé d'un facteur 2.",
  },
  // Fiscalité
  {
    mot: "Micro-entreprise",
    cat: "Fiscalité",
    def: "Régime simplifié : les cotisations sont un pourcentage du CA encaissé. Pas de CA = pas de charges sociales. Pas de TVA sous le seuil de franchise.",
    exemple:
      "21,2 % de cotisations + 0,3 % de formation + 1,7 % d'impôt = 23,2 % du CA — hors taxe pour frais de chambre CMA (0,48 % du CA, ≈ 176 €/an ici, exonérée si CA ≤ 5 000 €).",
  },
  {
    mot: "Versement fiscal libératoire (VFL)",
    cat: "Fiscalité",
    def: "Option micro : l'impôt sur le revenu est payé au fil de l'eau, 1,7 % du CA encaissé. Sinon, le barème s'applique sur 50 % du CA (abattement forfaitaire).",
    exemple:
      "Sur 36 573 € de CA : VFL = 622 € ; au barème (TMI 11 %) : 2 012 € — le VFL gagne ici.",
  },
  {
    mot: "Abattement micro-BIC",
    cat: "Fiscalité",
    def: "En micro, l'administration considère que 50 % du CA de services couvre les frais : l'impôt au barème ne porte que sur l'autre moitié.",
  },
  {
    mot: "CFP",
    cat: "Fiscalité",
    def: "Contribution à la formation professionnelle : 0,3 % du CA pour un artisan. Elle finance vos propres formations (CQP propreté, Certibiocide…).",
    exemple: "110 € sur l'année 1 — et elle ouvre ~1 000 € de droits CPF.",
  },
  {
    mot: "Franchise de TVA",
    cat: "Fiscalité",
    def: "Sous 37 500 € de CA, aucune TVA facturée ni récupérée. Au-delà (toléré jusqu'à 41 250 € une année), il faut facturer la TVA — neutre pour les clients professionnels qui la récupèrent.",
    exemple:
      "Dépassement attendu dès l'année 2 (47 545 € de CA projeté) : anticipé et sans danger.",
  },
  {
    mot: "Plafond micro",
    cat: "Fiscalité",
    def: "83 600 € de CA de services (2026-2028) : au-delà, sortie du régime micro vers une société. La bascule se prépare dès 70 000 € de CA glissant.",
    exemple:
      "Jamais approché sur 5 ans (année 5 ≈ 69 035 €) — le plafond est un indicateur, pas une contrainte.",
  },
  {
    mot: "CFE",
    cat: "Fiscalité",
    def: "Cotisation foncière des entreprises : taxe locale annuelle. Exonérée l'année de création, puis ≈ 300 €/an.",
    exemple: "0 € en 2026-2027, ~300 €/an dès l'année 2 (intégrée dans la projection).",
  },
  {
    mot: "TMI",
    cat: "Fiscalité",
    def: "Tranche marginale d'imposition du foyer fiscal. Sert au calcul de l'impôt si le versement libératoire est désactivé.",
    exemple: "TMI 11 % : impôt micro au barème = 36 573 × 50 % × 11 % ≈ 2 012 €.",
  },
  // Juridique
  {
    mot: "Activité artisanale (81.21Z)",
    cat: "Juridique",
    def: "Le nettoyage courant des bâtiments est une activité ARTISANALE : l'autorité compétente est la Chambre de métiers (CMA), et la mention du titre de séjour est « profession exercée », sans incidence sur le droit au séjour.",
  },
  {
    mot: "Récépissé",
    cat: "Juridique",
    def: "Document remis au dépôt du changement de statut : il maintient le droit au séjour mais N'AUTORISE PAS de travailler (art. R431-14 CESEDA). Aucune prestation avant la délivrance du titre.",
  },
  {
    mot: "Changement de statut",
    cat: "Juridique",
    def: "Passage du titre étudiant au certificat de résidence algérien mention « profession » (accord franco-algérien de 1968). Dossier déposé à la préfecture du domicile (Bobigny pour le 93).",
    exemple:
      "Critère jurisprudentiel : projet « réel, sérieux et cohérent » (CAA Paris, 04/06/2025) — pas de condition de revenu minimum à la première demande.",
  },
  {
    mot: "Guichet unique INPI",
    cat: "Juridique",
    def: "Le portail procedures.inpi.fr où s'immatricule la micro-entreprise. Gratuit pour une micro — aucun frais de greffe.",
  },
  {
    mot: "EI au réel",
    cat: "Juridique",
    def: "Entreprise individuelle au régime réel : les charges réelles se déduisent, cotisations TNS ≈ 32 % du bénéfice (plancher 1 300 €), impôt au barème.",
    exemple:
      "À 36 573 € de CA : 19 416 € nets — moins bien que la micro tant que les charges réelles restent faibles.",
  },
  {
    mot: "EURL",
    cat: "Juridique",
    def: "Société unipersonnelle à l'IS : rémunération de gérant TNS (1 € net coûte ≈ 1,45 €), IS sur le solde, puis dividendes (taxés à 45 % + 12,8 % au-delà de 10 % du capital).",
    exemple:
      "Variante de référence (rému 18 000 €) : 20 172 € nets — pertinente avec de vraies charges déductibles.",
  },
  {
    mot: "SASU",
    cat: "Juridique",
    def: "Société par actions unipersonnelle : président assimilé salarié (1 € net coûte ≈ 1,80 €), dividendes à la flat tax 31,4 %. Souple mais la plus chère à revenu identique.",
    exemple: "En tout-dividendes : 18 707 € nets et zéro droit retraite.",
  },
  {
    mot: "Facturation électronique",
    cat: "Juridique",
    def: "Depuis le 01/09/2026, toute entreprise doit pouvoir RECEVOIR des factures électroniques — d'où un logiciel de facturation compatible dès le départ.",
  },
  {
    mot: "Attestation de vigilance",
    cat: "Juridique",
    def: "Document URSSAF prouvant que vous êtes à jour de vos cotisations. Obligatoirement demandé par les clients pour tout contrat ≥ 5 000 € (conciergeries, syndics).",
  },
  // Aides & social
  {
    mot: "ACRE",
    cat: "Aides & social",
    def: "Réduction des cotisations sociales : 15,9 % au lieu de 21,2 % pour une création après le 01/07/2026 — sous conditions : demandeur d'emploi, RSA, moins de 26 ans, moins de 30 ans non indemnisable, ou adresse en QPV/ZFRR. L'exonération s'arrête à la fin du 3e trimestre civil suivant le début d'activité (30/06/2027 pour un démarrage en sept. 2026) ; le simulateur l'applique sur les 12 mois, comme le classeur certifié.",
    exemple:
      "Économie ≈ 1 500 € sur l'année 1. À vérifier : l'éligibilité (sig.ville.gouv.fr pour le QPV), demande sous 60 jours après l'immatriculation.",
  },
  {
    mot: "QPV",
    cat: "Aides & social",
    def: "Quartier prioritaire de la politique de la ville. L'adresse du domicile doit y figurer pour ouvrir l'ACRE (et le Prêt d'Honneur Quartiers).",
  },
  {
    mot: "CPF",
    cat: "Aides & social",
    def: "Compte personnel de formation, alimenté par l'alternance (~1 000 € attendus) : finance le CQP propreté et le Certibiocide sans toucher à la trésorerie.",
  },
  {
    mot: "Entrepreneur#Leader",
    cat: "Aides & social",
    def: "Parcours gratuit d'accompagnement à la création (BGE Île-de-France) : diagnostic, aide au business plan, attestation utile au dossier préfecture.",
  },
  {
    mot: "Retraite du micro-entrepreneur",
    cat: "Aides & social",
    def: "Les cotisations micro valident des trimestres : ≈ 14 250 € de CA de services valident 4 trimestres dans l'année (barème 2026).",
    exemple: "Avec 36 573 € de CA, l'année 1 valide ses 4 trimestres.",
  },
  // Métier propreté
  {
    mot: "Taux effectif B2B",
    cat: "Métier propreté",
    def: "Le tarif horaire moyen réellement facturé, entre le tarif standard (30 €/h) et le tarif remisé des contrats annuels (28 €/h).",
    exemple: "30 € × (1 − 50 % × 6,7 %) = 28,995 €/h avec moitié de contrats annuels.",
  },
  {
    mot: "Site B2B",
    cat: "Métier propreté",
    def: "Un client professionnel récurrent (bureau < 200 m², commerce, cabinet) : 2 passages/semaine × 1,2 h. La brique de base du modèle.",
    exemple: "Un site ≈ 301 €/mois de CA. Le plan officiel monte de 1 à 12 sites sur l'année.",
  },
  {
    mot: "Saisonnalité",
    cat: "Métier propreté",
    def: "Coefficient appliqué au B2B selon le mois : 0,9 en décembre et juillet, 0,65 en août (fermetures des bureaux).",
    exemple: "C'est elle qui fait chuter le net d'août à 2 660 € malgré 12 sites.",
  },
  {
    mot: "Rotation Airbnb",
    cat: "Métier propreté",
    def: "Un ménage complet entre deux locataires (2,5 h, 75 €) : linge, surfaces, contrôle. Paiement comptant — bon pour la trésorerie.",
  },
  {
    mot: "Capacité solo",
    cat: "Métier propreté",
    def: "Le maximum d'heures facturables par mois en travaillant seul : 165 h (≈ 38 h/semaine), trajets et administratif non compris.",
    exemple: "Le pic du plan officiel est à 161 h en juillet 2027 — 97,6 % d'occupation.",
  },
  {
    mot: "Taux d'occupation",
    cat: "Métier propreté",
    def: "Heures facturées ÷ capacité. Au-delà de 85 % trois mois de suite : augmenter les tarifs des NOUVEAUX contrats ; au-delà de 90 % durable : préparer l'embauche.",
  },
  {
    mot: "Certibiocide",
    cat: "Métier propreté",
    def: "Certification obligatoire (2026) pour utiliser des désinfectants professionnels de catégorie biocide — nécessaire pour la niche des cabinets médicaux. Finançable CPF.",
  },
  {
    mot: "Charte des 4 engagements",
    cat: "Métier propreté",
    def: "Le contrat de confiance affiché : devis sous 48 h, même intervenant, preuve photo après passage, rattrapage sous 24-48 h si insatisfait. « La propreté qui tient parole. »",
  },
  // Stratégie
  {
    mot: "Préréglage officiel (prudent)",
    cat: "Stratégie",
    def: "Les hypothèses du prévisionnel Excel certifié : charges variables 9 %, fixes 75 €/mois, zéro impayé. C'est la base auditée du dossier préfecture.",
  },
  {
    mot: "Préréglage réaliste terrain",
    cat: "Stratégie",
    def: "La version « toutes charges » : produits 5,5 %, déplacements 6,5 %, impayés 1,5 % du B2B, fixes 95 €/mois, renouvellement matériel 30 €/mois.",
  },
  {
    mot: "Scénario pessimiste",
    cat: "Stratégie",
    def: "Le test de résistance : sites −35 %, Airbnb/particuliers −40 %, vitrerie −40 %, prix −5 %. C'est le chiffre que la banque et la préfecture regardent.",
    exemple: "13 975 € nets/an : le projet reste vivable même en cas de démarrage difficile.",
  },
  {
    mot: "Tache d'huile",
    cat: "Stratégie",
    def: "La stratégie commerciale : concentrer les clients dans un rayon réduit (93 + alentours de Paris) pour réduire les trajets et caser plus de sites par jour.",
  },
  {
    mot: "Palier de saturation",
    cat: "Stratégie",
    def: "Occupation > 85 % trois mois : nouveaux contrats à 32-34 €/h (les clients existants gardent leur tarif). > 90 % durable : préparer l'embauche ET la bascule en société.",
  },
  {
    mot: "Bascule en société",
    cat: "Stratégie",
    def: "Le passage de la micro vers une EURL/SASU, à préparer un an avant le plafond micro ou dès 70 000 € de CA glissant — quand les charges réelles dépassent l'abattement de 50 %.",
  },
  // Analyse avancée
  {
    mot: "Sensibilité (matrice)",
    cat: "Stratégie",
    def: "Test « et si ? » à deux entrées : on fait varier deux leviers à la fois (nombre de sites, taux horaire) et on lit l'effet direct sur le revenu d'un mois plein. La grille de l'onglet Sensibilité du prévisionnel Excel.",
    exemple:
      "12 sites × 30 €/h → 3 646 €/mois hors saisonnalité ; repérez la première case ≥ 1 500 € pour connaître le minimum vital.",
  },
  {
    mot: "Tornado",
    cat: "Stratégie",
    def: "Classement des leviers par impact : chacun varie de ±10 % pendant que le reste est figé, la longueur de la barre montre de combien le net annuel bouge. Les barres les plus longues = vos vrais leviers de pilotage.",
    exemple:
      "Si « taux horaire » domine, 1 € de plus par heure rapporte plus que n'importe quel autre effort.",
  },
  {
    mot: "Objectif inversé (goal seek)",
    cat: "Stratégie",
    def: "Le calcul à l'envers : on fixe le revenu mensuel visé et le simulateur résout chaque levier séparément — quel taux horaire, combien de sites ou quelle durée de passage il faudrait.",
    exemple:
      "« Je veux 2 000 €/mois en croisière » → le solveur répond en sites, en €/h et en heures par passage.",
  },
  {
    mot: "Monte-Carlo",
    cat: "Stratégie",
    def: "Des milliers d'années simulées en tirant chaque levier au sort dans les bornes de l'étude de marché : on lit la DISTRIBUTION des résultats possibles plutôt qu'un chiffre unique. Les tirages sont reproductibles (graine fixe).",
    exemple:
      "« 80 % des années simulées donnent un net entre P10 et P90 ; probabilité d'atteindre l'objectif : 9 cas sur 10. »",
  },
  {
    mot: "P10 / P50 / P90",
    cat: "Finance",
    def: "Les percentiles d'une simulation Monte-Carlo : 10 % des cas font moins bien que le P10, la moitié moins bien que le P50 (médiane), 90 % moins bien que le P90. Le couloir P10→P90 contient 80 % des cas.",
  },
  {
    mot: "Churn (attrition)",
    cat: "Stratégie",
    def: "Part des clients récurrents perdus chaque année (résiliations, déménagements, insatisfaction). Option avancée : le plan saisi devient les acquisitions brutes, le parc effectif est réduit de la perte cumulée.",
    exemple: "10 %/an sur 12 sites ≈ 1 site à remplacer dans l'année juste pour rester à niveau.",
  },
  {
    mot: "Inflation (indexation)",
    cat: "Finance",
    def: "Option avancée de la projection 5 ans : revalorisation annuelle des prix (s'ajoute à la croissance des volumes) et hausse des charges fixes. À 0 %, la projection reste celle du classeur, à prix constants.",
  },
  {
    mot: "Année civile (prorata)",
    cat: "Fiscalité",
    def: "Le plafond micro et la franchise TVA s'apprécient par année CIVILE (janvier-décembre), au prorata du temps d'activité la première année — pas sur l'exercice du plan (septembre-août).",
    exemple:
      "Lancement au 1er septembre 2026 : seuil TVA 2026 = 37 500 € × 122/365 ≈ 12 534 € pour septembre-décembre.",
  },
  {
    mot: "Barème progressif",
    cat: "Fiscalité",
    def: "Les vraies tranches de l'impôt sur le revenu (0 %, 11 %, 30 %…) appliquées à 50 % du CA quand le versement libératoire est désactivé — plus précis que la TMI plate, surtout près d'un changement de tranche.",
  },
  {
    mot: "Trimestre de retraite",
    cat: "Aides & social",
    def: "Le CA micro valide des trimestres de retraite par paliers : ≈ 3 550 € pour 1 trimestre, ≈ 14 250 € pour les 4 trimestres de l'année (services BIC, barème 2026 : 150 SMIC horaire de revenu par trimestre).",
    exemple: "36 573 € de CA en année 1 : les 4 trimestres sont validés.",
  },
  {
    mot: "Atterrissage (re-prévision)",
    cat: "Stratégie",
    def: "La projection d'année recalculée en cours de route : les mois écoulés en chiffres RÉELS + les mois restants en prévision = où l'année va vraiment atterrir.",
    exemple:
      "Après 3 mois de réel à −10 % du plan, l'atterrissage montre l'écart de fin d'année si rien ne change.",
  },
  {
    mot: "Réel vs prévu",
    cat: "Stratégie",
    def: "La boucle de pilotage : saisir chaque mois le CA réellement facturé, le comparer au plan, et agir si l'écart dépasse 15 % (règle de la phase 9 de l'étude).",
  },
];

export const CATEGORIES = [
  "Tous",
  "Finance",
  "Fiscalité",
  "Juridique",
  "Aides & social",
  "Métier propreté",
  "Stratégie",
] as const;

export function getTerme(mot: string): Terme | undefined {
  const needle = mot.trim().toLowerCase();
  return TERMES.find(
    (t) => t.mot.toLowerCase() === needle || t.mot.toLowerCase().startsWith(needle),
  );
}
