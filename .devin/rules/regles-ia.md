---
trigger: model_decision
---

# Règles IA — Watchr

Ces règles s'appliquent à tout agent (Devin/Cascade) travaillant sur ce repo.

## 1. Comportement général

- Assistant de dev senior : direct, précis. Si une approche demandée est risquée ou sous-optimale, le dire clairement et proposer une alternative justifiée plutôt que d'exécuter sans broncher.
- Communication en français avec l'humain, code et commentaires en anglais (convention standard).
- Jamais d'invention de comportement technique incertain : inspecter le code existant, poser une question, ou documenter un `[?]` explicite dans le PR/commit description — puis le résoudre avant de merger.

## 2. Génération de code

- Code complet et production-ready : lisible, performant, sécurisé, avec gestion d'erreurs (try/catch sur tout I/O, validation des entrées).
- **Interdit** : placeholders (`TODO`, `// ...`, fausses implémentations, mocks non signalés) dans du code livré comme final.
- Correction/réécriture de fichier = fichier complet retourné, jamais un diff partiel qui laisse le fichier dans un état incohérent.
- Composants fonctionnels, `const` par défaut, composition > héritage.
- **Fichiers de composants ≤ 300 lignes.** Si un composant dépasse, extraire agressivement (sous-composants, hooks custom).

## 3. Avant d'implémenter

- Pour toute feature touchant plus de 2 fichiers ou introduisant une intégration externe : présenter un plan (étapes, fichiers touchés, risques) avant de coder. Attendre validation.
- Vérifier si une lib existante dans `package.json` (ou une lib npm maintenue) couvre déjà le besoin avant d'écrire une implémentation from scratch.
- Si la demande est ambiguë ou en conflit avec l'architecture existante (voir `AGENTS.md`), le signaler immédiatement plutôt que de deviner.

## 4. Sécurité & fiabilité — non négociable

- Toute route mutante (`POST`/`PATCH`/`DELETE`) validée avec Zod avant traitement.
- Tokens JWT : access court (15min), refresh long (7-30j) stocké en DB avec révocation possible.
- Jamais de secret en dur — tout passe par `.env`, validé au démarrage (crash explicite si variable manquante, pas de fallback silencieux).
- Rate limiting sur les routes d'auth et d'import.
- Toute réponse d'erreur API a un format cohérent (`{ error: { code, message } }`), jamais de stack trace exposée en prod.

## 5. Spécifique mobile (Expo sans prebuild)

- **Aucune lib nécessitant du code natif custom** ou un dev client non standard. Vérifier la compatibilité Expo Go avant d'ajouter une dépendance.
- Pas de `Context` pour l'état complexe (utiliser Zustand). Pas de prop drilling au-delà de 2 niveaux.
- États de chargement et d'erreur obligatoires sur tout écran consommant une query réseau (pas de "flash" d'écran vide).
- **Internationalisation** : tout texte UI dans les composants/écrans mobile passe par `useI18n`/`t()`. Les dates utilisent `dateFnsLocale`. Les messages d'erreur API passent par `useErrorMessage`. Les nouvelles clés sont ajoutées en FR et EN dans `apps/mobile/src/i18n/translations.ts`.

## 6. Definition of Done

Une tâche n'est considérée terminée que si :
- [ ] Code sans placeholder ni `console.log` de debug oublié
- [ ] Erreurs et edge cases gérés (réseau down, 401/403, données vides, import malformé)
- [ ] Hypothèses non confirmées documentées avec `[?]` dans la description du changement