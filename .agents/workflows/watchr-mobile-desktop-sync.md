---
description: Génère un prompt Devin structuré pour synchroniser une page/feature Watchr entre le client mobile (React Native/Expo) et le client desktop (Vite + React), à parité UI et logique métier. Utiliser ce skill dès que ArquiTech mentionne une désynchronisat
---

# Watchr — Sync Mobile/Desktop

Ce skill produit un prompt Devin prêt à l'emploi pour resynchroniser une page ou feature Watchr entre le client mobile (Expo) et le client desktop (Vite + React), en couvrant UI/UX et logique métier.

## Quand l'utiliser

- ArquiTech signale qu'une page a divergé entre mobile et desktop sur Watchr.
- ArquiTech demande de préparer un audit ou un prompt d'implémentation pour réaligner les deux clients.
- Toute variante de "resynchroniser", "réaligner", "mettre à jour X côté mobile pour matcher le desktop" (ou l'inverse) appliquée à Watchr.

## Ce que le skill doit clarifier avant de générer le prompt

Si l'info n'est pas déjà donnée dans la conversation, demander en QCM (format checkbox, cf. préférences ArquiTech) :

1. **Nom de la page/feature concernée** (obligatoire — jamais de placeholder non résolu dans le prompt final).
2. **Périmètre** : UI/UX seule, logique métier seule, ou les deux (défaut recommandé : les deux, sauf indication contraire).
3. **Source of truth** : desktop de référence, mobile de référence, ou à déterminer par l'audit (défaut si non précisé : desktop = référence, à valider explicitement dans le prompt généré).
4. **Contrainte de partage de code** : réutiliser du code partagé (hooks/services/types communs), dupliquer et adapter, ou laisser Devin trancher selon la structure existante du repo (défaut : laisser Devin trancher).

Ne pas poser de question si la réponse est déjà déductible du contexte de la conversation.

## Structure du prompt à générer

Toujours produire un prompt Devin complet suivant cette structure (voir `template.md` pour le gabarit exact à instancier) :

1. **Contexte projet** — rappel stack Watchr (Expo managed workflow / Vite + React, backend Node/Express/MongoDB sur ArquiTechServer).
2. **Hypothèse de source of truth** — explicite, à valider par Devin avant exécution si ambiguë.
3. **Périmètre** — UI/UX + logique métier (ou sous-ensemble choisi).
4. **Étapes obligatoires, dans l'ordre** :
   - Audit comparatif (bloquant — pas de code avant restitution et validation de l'audit)
   - Proposition d'architecture de synchro (partage vs duplication, justifiée)
   - Implémentation (respect idiome plateforme, TypeScript strict, gestion de tous les états : loading/empty/error/success)
   - Vérification (cas de test manuels + points de divergence volontaires signalés)
5. **Contraintes techniques** — pnpm, pas de prebuild Expo, composants ≤300 lignes, Zod pour validation, pas de nouvelle dépendance non justifiée.
6. **Livrables attendus** — diff complet, justification des choix d'archi, liste de tests de non-régression, points de vigilance.

## Règles de génération

- Ne jamais laisser de placeholder du type `[NOM_DE_LA_PAGE]` dans le prompt final livré à ArquiTech — si l'info manque, la demander plutôt que de livrer un template incomplet.
- Toujours garder l'étape d'audit comme bloquante par défaut, sauf si ArquiTech demande explicitement à Devin d'enchaîner sans validation intermédiaire.
- Adapter la contrainte de partage de code (étape 2 du prompt généré) à la réponse d'ArquiTech ou à "laisser Devin décider" par défaut.
- Livrer le résultat sous forme de fichier `.md` prêt à copier-coller dans Devin (pas de contenu tronqué, pas de "..." ).
- Rappeler brièvement en fin de réponse (3 bullets max, cf. préférences ArquiTech) : le point de vigilance sur l'hypothèse source of truth, et si l'étape d'audit est bien bloquante ou non.
- le mobile est la "Source of truth"

## Fichiers du skill

- `template.md` — gabarit du prompt Devin à instancier avec les paramètres clarifiés (nom de page, périmètre, source of truth, contrainte de partage de code).