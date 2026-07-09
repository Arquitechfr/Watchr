---
trigger: always_on
---

# Règles IA — Watchr

Ces règles s'appliquent à tout agent (Devin/Cascade) travaillant sur ce repo.

## 0. URLs de production

- **Site web (frontend)** : https://watchr.me
- **API backend** : https://api.watchr.me

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

## 5. Remote Config — configuration dynamique non négociable

- Les valeurs de configuration **runtime** (`backend_url`, flags, etc.) sont stockées dans MongoDB (collection `mobile_config`) et servies via l'endpoint public `GET /internal/mobile-config` (cache process-level 30s côté backend).
- Côté mobile et web, `remoteConfigService` (singleton) charge la config au lancement (**init bloquant** dans le bootstrap), la cache localement (AsyncStorage côté mobile, localStorage côté web), et la rafraîchit toutes les 5 min + au retour foreground (AppState / visibilitychange).
- **Écriture = CLI uniquement** : `pnpm --filter backend mobile-config set <key> <value> [type]`. Jamais d'endpoint HTTP d'écriture (décision de sécurité : un endpoint d'écriture sur `backend_url` est un vecteur d'attaque disproportionné).
- **Lecture = endpoint public sans auth** : le payload ne contient aucune donnée sensible par design.
- **L'URL backend ne doit jamais être hardcodée** dans le code : utiliser `remoteConfigService.getConfig().backend_url` ou `getApiBaseUrl()` (exporté depuis `services/api.ts`).
- Les valeurs **build-time** (Firebase, EAS, Sentry) restent dans `.env` et ne peuvent pas être dynamiques (inlinées par Expo/Vite à build time).
- Toute nouvelle valeur de configuration runtime doit être : (1) ajoutée à `DEFAULT_REMOTE_CONFIG` dans `config/defaults.ts` côté mobile **et** web, (2) seedée en MongoDB via le CLI, (3) documentée dans le plan de la feature.
- Fichiers clés : `apps/backend/src/models/MobileConfig.ts`, `apps/backend/src/routes/internal/mobileConfig.routes.ts`, `apps/backend/scripts/mobile-config-cli.ts`, `apps/{mobile,web}/src/config/defaults.ts`, `apps/{mobile,web}/src/services/remoteConfig.ts`, `apps/{mobile,web}/src/hooks/useRemoteConfig.ts`.

## 6. Spécifique mobile (Expo sans prebuild)

- **Aucune lib nécessitant du code natif custom** ou un dev client non standard. Vérifier la compatibilité Expo Go avant d'ajouter une dépendance.
- Pas de `Context` pour l'état complexe (utiliser Zustand). Pas de prop drilling au-delà de 2 niveaux.
- États de chargement et d'erreur obligatoires sur tout écran consommant une query réseau (pas de "flash" d'écran vide).
- **Internationalisation** : tout texte UI dans les composants/écrans mobile passe par `useI18n`/`t()`. Les dates utilisent `dateFnsLocale`. Les messages d'erreur API passent par `useErrorMessage`. Les traductions sont splitées par langue dans `apps/mobile/src/i18n/locales/<lang>.ts` (mobile) et `apps/backend/src/i18n/locales/<lang>.ts` (backend). **Toute nouvelle clé ou modification doit être répercutée dans tous les fichiers de locale de chaque côté** — les fichiers `en.ts` et `fr.ts` (et toute autre langue supportée) doivent rester en parité parfaite. Une tâche n'est pas terminée tant que toutes les langues ne sont pas synchronisées.

## 7. Definition of Done

Une tâche n'est considérée terminée que si :
- [ ] Code sans placeholder ni `console.log` de debug oublié
- [ ] Erreurs et edge cases gérés (réseau down, 401/403, données vides, import malformé)
- [ ] Hypothèses non confirmées documentées avec `[?]` dans la description du changement
- [ ] **Synchronisation web ↔ mobile** : la feature existe et fonctionne sur les deux plateformes (mobile et web), ou une raison documentée justifie l'absence sur l'une d'elles
- [ ] **Remote Config** : si la feature introduit une valeur de configuration runtime, celle-ci est ajoutée à `DEFAULT_REMOTE_CONFIG` (mobile + web), seedée en MongoDB, et aucune URL backend n'est hardcodée
- mobile is Source of truth par rapport au web ou autres.
- Utilisez tous les MCP que vous jugez pertinents pour votre demande.