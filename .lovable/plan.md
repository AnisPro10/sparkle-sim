# Plan d’implémentation — Simulateur L’AZ du Clean

## 1. Poser le moteur financier certifiable
- Définir les types des hypothèses, volumes mensuels, résultats, trésorerie, statuts et projections.
- Implémenter une fonction pure `computeModel(hypotheses)` indépendante de React.
- Reproduire les constantes et formules 2026 fournies : ACRE sur 10 mois, VFL/barème, CFP, charges, décalage d’encaissement B2B/vitrerie, capacité, projection et comparatif juridique.
- Ajouter les presets « Officiel (prudent) » et « Réaliste terrain », ainsi que les variantes pessimiste/réaliste/optimiste.
- Protéger les divisions et borner les entrées avec Zod.

## 2. Créer l’état persistant du simulateur
- Fournir un contexte global et le hook `useSimulator` pour modifier les hypothèses et recalculer instantanément tous les écrans.
- Sauvegarder automatiquement l’état validé dans `localStorage`.
- Charger et partager un état sérialisé en base64 via `#s=`.
- Gérer les scénarios personnalisés nommés : enregistrer, charger et supprimer.
- Ajouter l’export CSV des résultats et une action de partage/copier le lien.

## 3. Installer l’interface « épuré suisse »
- Remplacer le thème générique par les tokens bleu canard, bleu nuit, or, gris clair, surfaces et états succès/alerte, avec une variante sombre.
- Construire un shell responsive : monogramme AZ, identité L’AZ du Clean, sidebar repliable, barre d’actions, navigation mobile et sélecteur de thème.
- Respecter la référence visuelle jointe : typographie forte, hiérarchie compacte, lisérés dorés, cartes blanches sobres et données très lisibles.
- Mettre à jour le titre, la description et les métadonnées sociales en français.

## 4. Réaliser les 10 écrans fonctionnels
- **Synthèse** : six verdicts, jauges, alertes, graphique empilé du CA avec ligne de net et seuil de 1 500 €.
- **Hypothèses** : formulaires groupés, interrupteurs ACRE/VFL et boutons de presets.
- **Plan d’activité** : tableau éditable sur 12 mois, CA, heures et alertes de surcharge.
- **Compte de résultat** : cascade analytique par activité, marges, fixes, matériel et net réel.
- **Trésorerie** : courbe mensuelle, point bas, apport minimal/recommandé et verdict de financement.
- **Scénarios** : comparaison des trois scénarios et gestion des scénarios nommés.
- **Statuts juridiques** : classement Micro, EI, EURL et SASU avec explications pédagogiques.
- **Projection 5 ans** : croissance modifiable, CA/net, seuils micro et TVA, badges annuels.
- **Démarrage** : checklist persistante, chemin critique, budget de 785 € et critères de viabilité.
- **Dictionnaire** : glossaire consultable avec définitions simples et exemples du projet ; les termes clés seront aussi accessibles par info-bulles.

## 5. Vérifier la parité et l’expérience
- Ajouter des tests ciblés du moteur pur pour les valeurs de contrôle obligatoires (taux global 23,68 %, taxe chambre CMA 0,48 % incluse) : CA 36 573 €, net réel 22 521 €, croisière ≈ 2 927 €/mois, objectif en janvier 2027, point bas +920 €, scénarios 13 861 / 22 521 / 31 155 €.
- Vérifier les parcours interactifs : changement d’hypothèse, preset, édition mensuelle, scénario, partage URL, restauration locale et export.
- Contrôler l’affichage desktop et mobile, le mode sombre, la lisibilité des tableaux et graphiques, ainsi que l’absence d’erreurs de console.