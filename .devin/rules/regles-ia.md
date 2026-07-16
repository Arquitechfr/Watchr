---
trigger: always_on
---

# Règles IA — Watchr

Ces règles s'appliquent à tout agent travaillant sur ce repo.

## 0. Ordre de priorité

1. `AGENTS.md`
2. `.devin/rules/regles-ia.md` (ce fichier)
3. Instructions globales de l'agent

## 1. Comportement général

- Assistant senior : direct, précis. Si une approche est risquée ou sous-optimale, le dire clairement et proposer une alternative justifiée.
- Communiquer en français avec l'humain. Code et commentaires en anglais.
- Ne jamais inventer un comportement technique incertain. Inspecter le code, poser une question, ou documenter un `[?]` explicite — puis le résoudre avant merge.
- **(RECOMMANDATION)** : préfixer tout conseil technique, architectural, librairie ou pattern avec **`(RECOMMANDATION)`**.

## 2. Génération de code

- Code production-ready : lisible, performant, sécurisé, gestion d'erreurs (try/catch sur I/O, validation des entrées).
- **Interdit** : placeholders (`TODO`, `// ...`, fausses implémentations, mocks non signalés) dans du code livré comme final.
- Correction/réécriture de fichier = fichier complet retourné, jamais un diff partiel.
- Composants fonctionnels, `const` par défaut, composition > héritage.
- **Fichiers de composants ≤ 300 lignes.** Si dépassement, extraire agressivement (sous-composants, hooks custom).

## 3. Avant d'implémenter

- Pour toute feature > 2 fichiers ou intégration externe : présenter un plan (étapes, fichiers, risques) et attendre validation.
- Vérifier si une lib existante dans `package.json` couvre déjà le besoin avant d'écrire from scratch.
- Si une demande est ambiguë ou en conflit avec `AGENTS.md`, le signaler immédiatement plutôt que de deviner.

## 4. Sécurité & fiabilité

- Toute route `POST`/`PATCH`/`DELETE` validée avec Zod.
- JWT : access 15 min, refresh 7-30 j stocké en DB avec révocation possible.
- Pas de secret en dur : `.env` obligatoire, crash au démarrage si variable manquante.
- Rate limiting sur auth et import.
- Format d'erreur API cohérent : `{ error: { code, message } }`. Pas de stack trace en prod.

## 5. Remote Config

- Configuration runtime (`backend_url`, flags, etc.) dans MongoDB `mobile_config`, servie par `GET /internal/mobile-config` (cache 30s backend).
- Mobile : `remoteConfigService` init bloquant, cache AsyncStorage, refresh 5 min + foreground.
- Écriture = CLI (`pnpm --filter backend mobile-config set ...`) ou API admin authentifiée. Jamais d'endpoint public d'écriture.
- Lecture = endpoint public sans auth (pas de données sensibles).
- URL backend non hardcodée : `remoteConfigService.getConfig().backend_url` ou `getApiBaseUrl()`.
- Build-time vars (Firebase, EAS) restent dans `.env`.
- Nouvelle valeur runtime : (1) ajouter à `DEFAULT_REMOTE_CONFIG`, (2) seeder MongoDB, (3) documenter dans le plan.
- Fichiers clés : `apps/backend/src/models/MobileConfig.ts`, `apps/backend/src/routes/internal/mobileConfig.routes.ts`, `apps/backend/scripts/mobile-config-cli.ts`, `apps/mobile/src/config/defaults.ts`, `apps/mobile/src/services/remoteConfig.ts`, `apps/mobile/src/hooks/useRemoteConfig.ts`.

## 6. Mobile & Web

- Aucune lib avec code natif custom ou dev client non standard. Vérifier compatibilité Expo Go.
- Pas de `Context` pour l'état complexe (Zustand). Pas de prop drilling > 2 niveaux.
- États loading/error obligatoires sur les écrans consommant du réseau.
- i18n : tout texte UI mobile passe par `useI18n`/`t()`. Dates via `dateFnsLocale`. Erreurs API via `useErrorMessage`. Traductions dans `apps/mobile/src/i18n/locales/<lang>.ts` (mobile) et `apps/backend/src/i18n/locales/<lang>.ts` (backend). Toute clé/modification doit être répercutée dans **tous** les fichiers de locale (`en.ts`, `fr.ts`, etc.) des deux côtés — parité parfaite requise.

### 6b. Compatibilité Web

- L'app Expo est aussi une web app desktop. Tout code compatible web.
- Guards `Platform.OS` pour les modules natifs.
- Stockage : utiliser `src/utils/secureStorage.ts`. Jamais d'import direct `expo-secure-store`.
- Layout responsive via Tailwind breakpoints ou `useWindowDimensions()`.
- Pas de régression mobile.
- Test web : `pnpm --filter mobile web` sans crash.

## 7. Backoffice Admin

- App ViteJS séparée, routes `/api/admin/*`.
- Auth JWT + `role: "admin"` + `requireAdmin`.
- Thème aligné mobile : `#1A1614` dark bg, `#C65D3A` primary, `#F5F0EB` text. Dark mode.
- Toutes les routes admin validées avec Zod.
- Remote Config : l'admin peut lire/écrire via UI (endpoint `requireAdmin`).
- Routes additives, pas de régression backend.
- Interface en anglais.
- Test admin : `pnpm --filter admin dev` sans crash.

## 8. Definition of Done

Une tâche n'est terminée que si :
- [ ] Code sans placeholder ni `console.log` de debug oublié.
- [ ] Edge cases gérés (réseau down, 401/403, données vides, import malformé).
- [ ] Hypothèses non confirmées documentées avec `[?]`.
- [ ] Remote Config : nouvelle valeur runtime ajoutée à `DEFAULT_REMOTE_CONFIG`, seedée, aucune URL backend hardcodée.
- [ ] Web : `pnpm --filter mobile web` sans crash, guards `Platform.OS`, layout responsive.
- [ ] Admin : si touché, `pnpm --filter admin dev` sans crash, routes Zod, pas de régression backend.
- [ ] Pas de régression mobile iOS/Android.
- [ ] i18n : parfaite parité entre toutes les locales mobile et backend.
- [ ] Mobile = source of truth.
- [ ] MCP pertinents utilisés.
- [ ] Logiques optimistic UI/UX mises en place.

## 9. URLs de production

- **Landing** : https://watchr.me
- **Web app** : https://app.watchr.me
- **API** : https://api.watchr.me
- **Backoffice** : https://backoffice.watchr.me
