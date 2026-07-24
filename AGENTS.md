# AGENTS.md — Watchr
## Contexte

Watchr est un tracker de séries/films (successeur perso de TV Time).
MVP : tracking watch-status + notes/ratings + commentaires publics sur shows/épisodes, import prioritaire des exports GDPR TV Time.

## Stack

| Domaine | Choix |
|---|---|
| Backend runtime | Node.js ESM |
| Backend framework | Express.js |
| BDD | MongoDB + Mongoose |
| Auth | JWT (access + refresh) |
| Validation | Zod |
| Mobile | React Native + Expo (prebuild autorisé) |
| État mobile | Zustand + TanStack Query |
| Navigation mobile | React Navigation (native-stack, bottom-tabs) |
| Réseau mobile | Axios |
| Stockage local mobile | expo-secure-store (tokens), AsyncStorage (cache) |
| Style mobile | NativeWind |
| Web | react-native-web via Expo Web (`expo start --web`) |
| Style web | NativeWind + Tailwind breakpoints |
| Package manager | pnpm |
| Lint/Format | ESLint + Prettier |
| Tests | Vitest |
| Admin | ViteJS + React 18 + TypeScript |
| Admin UI | TailwindCSS + shadcn/ui |
| Admin state | Zustand |
| Admin routing | React Router v6 |
| Landing | ViteJS + React 19 + TypeScript |
| Landing UI | TailwindCSS + shadcn/ui |
| Landing i18n | react-i18next (14 langues) |
| i18n tooling | `@watchr/i18n-languages` (package partagé) + LibreTranslate self-hosted |
| Landing SEO | react-helmet-async + JSON-LD |
| Emails | React Email (@react-email/components + @@react-email/render) |
| Workers | BullMQ + Redis (processus séparés via PM2) |

## Structure du repo

```
watchr/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   ├── validators/       # schémas Zod
│   │   │   ├── config/           # dotenv + validation au démarrage
│   │   │   ├── emails/           # templates React Email (.tsx) + composants partagés
│   │   │   ├── workers/          # workers BullMQ (1 fichier *.worker.ts + 1 start*.ts par worker)
│   │   │   └── app.ts
│   │   └── package.json
│   ├── mobile/
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── navigation/
│   │   ├── App.tsx              # Entry point — mobile + web
│   │   └── package.json
│   ├── admin/
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   │   ├── ui/                # shadcn/ui
│   │   │   │   ├── layout/
│   │   │   │   └── shared/
│   │   │   ├── hooks/
│   │   │   ├── lib/                   # api client, utils
│   │   │   ├── store/                 # Zustand
│   │   │   └── types/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── landing/
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/                # shadcn/ui
│       │   │   ├── layout/            # Header, Footer
│       │   │   ├── sections/          # Hero, Features, Import, Showcase, Stats, Testimonials, FAQ, CTA
│       │   │   └── shared/            # Logo, ThemeToggle, LanguageSwitcher, Seo
│       │   ├── hooks/                 # useTheme, useScrollReveal
│       │   ├── i18n/                  # config + locales/ (14 langues)
│       │   ├── lib/                   # utils
│       │   ├── assets/                # splash backgrounds, images
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/                    # favicon, icons, og-image, robots.txt, sitemap.xml
│       ├── package.json
│       └── vite.config.ts
├── packages/
│   └── i18n-languages/            # package partagé (langues supportées, drapeaux, date-fns loaders)
│       ├── src/index.ts            # source of truth: 14 langues, labels, flags, normalizeLocale
│       ├── scripts/translate.ts    # script de traduction auto (LibreTranslate) — création from scratch
│       ├── scripts/sync-translations.ts  # sync incrémental (missing/obsolete keys)
│       └── .env                    # LIBRETRANSLATE_URL + LIBRETRANSLATE_KEY
├── pnpm-workspace.yaml
└── AGENTS.md
```

## Commandes

- `pnpm install` : installation à la racine
- `pnpm --filter backend dev` : backend dev
- `pnpm --filter mobile start` : mobile dev (Expo dev client)
- `pnpm --filter mobile web` : web dev
- `npx expo export --platform web --output-dir dist` : build web (depuis `apps/mobile`)
- `pnpm --filter backend mobile-config set <key> <value> [type]` : écriture remote config (types: string, number, boolean, json)
- `pnpm --filter backend mobile-config list` : liste remote config
- `pnpm --filter backend mobile-config:seed` : seed remote config
- `pnpm --filter admin dev` : admin dev (port 5173)
- `pnpm --filter admin build` : admin build
- `pnpm --filter landing dev` : landing dev (port 5174)
- `pnpm --filter landing build` : landing build
- `pnpm --filter landing preview` : landing preview
- `pnpm --filter backend promote-admin <email>` : promouvoir un user admin
- `pnpm --filter @watchr/i18n-languages translate --app <mobile|backend|landing> --target <lang1,lang2,...>` : traduire les locales via LibreTranslate (ex: `--target nl,pl,tr,ru,ja,ko,zh`)
- `pnpm --filter @watchr/i18n-languages translate --app <app> --target <langs> --force` : forcer la re-traduction (ignore le cache)
- `pnpm --filter @watchr/i18n-languages sync --app <mobile|backend|landing> [--target <langs>] [--dry-run]` : sync incrémental des locales (détecte missing/obsolete, traduit le delta via LibreTranslate)

## URLs de production

- **Landing** : https://watchr.me
- **Web app** : https://app.watchr.me
- **API** : https://api.watchr.me
- **Backoffice** : https://backoffice.watchr.me

## Contraintes et principes

1. **Modules natifs** : les libs natives doivent avoir un config plugin Expo officiel. Prebuild autorisé. Signaler avant d'ajouter du code natif custom.
2. **pnpm uniquement** : jamais npm/yarn/bun dans les commandes ou la doc.
3. **Sources de données** : TMDB est la source principale. Le parser TV Time GDPR est tolérant (détection par header) et produit un rapport d'erreurs ligne par ligne.
4. **Planification obligatoire** : toute feature ou changement architectural > 2 fichiers ou intégration externe fait l'objet d'un plan validé avant implémentation.
5. **Internationalisation** : 14 langues (`en`, `fr`, `es`, `pt`, `de`, `it`, `ar`, `nl`, `pl`, `tr`, `ru`, `ja`, `ko`, `zh`). Tout texte UI mobile passe par `useI18n`/`t()`. Dates via `date-fns` + `dateFnsLocale`. Messages d'erreur API via `useErrorMessage`. Traductions dans `apps/mobile/src/i18n/locales/<lang>.ts` (mobile), `apps/backend/src/i18n/locales/<lang>.ts` (backend) et `apps/landing/src/i18n/locales/<lang>.ts` (landing). Le package `@watchr/i18n-languages` est la source de vérité pour la liste des langues, labels, drapeaux et loaders date-fns.

   **Règle stricte pour l'IA** : `en.ts` est la **seule** source of truth. L'IA ne modifie **JAMAIS** manuellement les fichiers `fr.ts`, `es.ts`, `pt.ts`, `de.ts`, `it.ts`, `ar.ts`, `nl.ts`, `pl.ts`, `tr.ts`, `ru.ts`, `ja.ts`, `ko.ts`, `zh.ts`. L'IA modifie uniquement `en.ts` puis lance `pnpm --filter @watchr/i18n-languages sync --app <app>`. **INTERDIT** d'éditer manuellement un fichier de locale non-anglais. Voir section **Procédure de traduction** ci-dessous.
6. **Compatibilité Web** : l'app Expo est aussi une web app desktop. Tout code doit être compatible web.
   - Guards `Platform.OS` pour les modules natifs (`expo-notifications`, `expo-secure-store`, `expo-file-system`, `expo-sharing`, etc.).
   - Layout responsive via Tailwind breakpoints (`md:`, `lg:`) ou `useWindowDimensions()`.
   - Stockage sécurisé : utiliser `src/utils/secureStorage.ts` (localStorage fallback). Jamais importer `expo-secure-store` directement hors de ce wrapper.
   - Navigation web : configurer les paths URL dans `linking` de React Navigation.
   - Pas de régression mobile : les guards web préservent le flow native.
   - Test web : `pnpm --filter mobile web` doit lancer sans crash.
7. **Backoffice Admin** : app ViteJS séparée, routes `/api/admin/*`.
   - Auth via JWT, rôle `role: "user" | "admin"`, middleware `requireAdmin`.
   - Thème aligné mobile : dark bg `#1A1614`, primary `#C65D3A`, text `#F5F0EB`. Dark mode par défaut.
   - Toutes les routes admin validées avec Zod.
   - Remote Config : l'admin peut lire/écrire via UI (endpoint `requireAdmin`), en complément du CLI.
   - Routes admin additives, pas de régression backend.
   - Interface admin en anglais.
   - Test admin : `pnpm --filter admin dev` lance sans crash.
8. **Landing Page** : app ViteJS séparée (`apps/landing/`), statique, pas d'API backend.
   - Stack : React 19 + TailwindCSS + shadcn/ui + react-i18next + react-helmet-async.
   - Thème aligné mobile : dark bg `#1A1614`, primary `#C65D3A`, text `#F5F0EB`. Toggle dark/light avec localStorage + `prefers-color-scheme`.
   - i18n : 14 langues (en, fr, es, pt, de, it, ar, nl, pl, tr, ru, ja, ko, zh). RTL pour l'arabe. Traductions dans `apps/landing/src/i18n/locales/<lang>.ts`. Parité parfaite entre tous les fichiers de locale. Loaders dynamiques dans `apps/landing/src/i18n/config.ts` (lazy import par langue).
   - SEO dynamique : react-helmet-async, JSON-LD (WebSite, SoftwareApplication, FAQPage), hreflang, OG/Twitter Cards, robots.txt, sitemap.xml.
   - Performance : code splitting (manualChunks), lazy loading sections, font preload, PWA (vite-plugin-pwa).
   - Assets réutilisés depuis mobile (favicon, icon, og-image, splash backgrounds).
   - Pas de régression sur les autres apps.
   - Test landing : `pnpm --filter landing dev` lance sans crash.
9. **Recommandations explicites** : tout conseil technique, architectural, librairie ou pattern doit être préfixé par **`(RECOMMANDATION)`**. Lors d'une question à choix multiples (outil `ask_user_question`), la recommandation **doit** être incluse directement dans le texte de la question, pas placée à la fin de la réponse ni absente. L'utilisateur doit voir la recommandation **avant** de choisir.
10. **Remote Config** : valeurs runtime (`backend_url`, flags, etc.) dans MongoDB `mobile_config`, endpoint public `GET /internal/mobile-config` (cache 30s côté backend).
   - Mobile : `remoteConfigService` init bloquant, cache AsyncStorage, refresh 5 min + foreground.
   - Écriture = CLI (`pnpm --filter backend mobile-config set ...`) ou API admin authentifiée. Jamais d'endpoint public d'écriture.
   - Lecture = endpoint public sans auth (pas de données sensibles).
   - URL backend non hardcodée : `remoteConfigService.getConfig().backend_url` ou `getApiBaseUrl()`.
   - Build-time vars (Firebase, EAS) restent dans `.env`.
   - Nouvelle valeur runtime : ajouter à `DEFAULT_REMOTE_CONFIG`, seeder MongoDB, documenter dans le plan.
11. **Emails** : templates construits avec React Email (`@react-email/components` + `@react-email/render`).
   - Templates en `.tsx` dans `apps/backend/src/emails/templates/`, composants partagés dans `apps/backend/src/emails/components/`.
   - Rendu HTML string via `renderEmail()` (`apps/backend/src/emails/render.ts`), utilisant `@react-email/render`.
   - `EmailService` (`apps/backend/src/services/email.service.tsx`) préserve son API publique — les callers ne changent pas.
   - Sujets via `translateEmail()` (i18n), textes dans `apps/backend/src/i18n/locales/<lang>.ts`.
   - Design tokens alignés sur mobile/landing/admin : `#1A1614` dark bg, `#C65D3A` primary, `#F5F0EB` text, font `Outfit`.
   - Dark mode supporté via CSS dans `<Head>` avec hacks Gmail (`u + .email-body`) + Outlook (`[data-ogsb]`).
   - RTL arabe : `dir="rtl"` sur `<Html>`.
   - Emails custom (admin, AI digest) : HTML arbitraire sanitizé via `sanitizeHtml()` puis wrappé dans `<CustomEmail>` avec `dangerouslySetInnerHTML`.
   - Fichiers clés : `apps/backend/src/emails/components/EmailLayout.tsx`, `apps/backend/src/emails/render.ts`, `apps/backend/src/services/email.service.tsx`.

12. **Composants natifs d'UI interdits** : jamais `Alert.alert()`, `Alert.prompt()` ou tout équivalent natif RN pour les dialogues/alertes/confirmations. Utiliser le composant custom `CustomAlert` (`apps/mobile/src/components/CustomAlert.tsx`) via `useUIStore.showAlert()`. Snackbars via `useUIStore.showSnackbar()`. Tout nouveau besoin UI (input dialog, bottom sheet, etc.) doit être un composant custom aligné sur le design system — jamais l'équivalent natif. Fichiers clés : `apps/mobile/src/components/CustomAlert.tsx`, `apps/mobile/src/store/uiStore.ts`.
13. **Gestion du clavier (mobile)** : tout screen ou composant contenant un `TextInput` doit gérer explicitement le clavier pour éviter que l'input soit masqué.
   - **Input en bas fixé** (chat, commentaires) : pattern `useKeyboardHandler` + `useSharedValue` + `useAnimatedStyle` + `Animated.View` spacer (référence : `ShowCommentsScreen.tsx`, `ChatScreen.tsx`, `CommentThreadScreen.tsx`).
   - **Input dans le contenu scrollable** (recherche, formulaires, filtres) : `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="interactive"` sur le `ScrollView` ou `FlatList` parent.
   - **Formulaires centrés** (auth, onboarding) : `KeyboardAwareScrollView` de `react-native-keyboard-controller` en mode `layout` avec `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="interactive"` (référence : `LoginScreen.tsx`, `RegisterScreen.tsx`).
   - **Web** : `KeyboardAwareScrollView` est inerte sur web (pas de clavier natif), le `Platform.OS` guard sur `contentContainerStyle` préserve le layout desktop.
   - Fichiers de référence : `apps/mobile/src/screens/ShowCommentsScreen.tsx`, `apps/mobile/src/screens/auth/LoginScreen.tsx`, `apps/mobile/src/screens/profile/EditProfileScreen.tsx`.
14. **Workers (pas de crons)** : toute tâche planifiée ou asynchrone récurrente doit être implémentée comme un worker BullMQ, jamais comme un cron natif (`node-cron`, `setInterval`, etc.).
   - **Pattern** : 1 fichier `*.worker.ts` (Queue + Worker + `schedule*()`) + 1 fichier `start*.ts` (entry point : connect DB/Redis, schedule, start worker, SIGTERM).
   - **Orchestration** : PM2 via `ecosystem.config.cjs` — chaque worker est un processus séparé (`instances: 1`, `autorestart: true`).
   - **Repeat** : utiliser `repeat: { pattern: "..." }` de BullMQ (syntaxe cron) pour les tâches récurrentes.
   - **Redis** : connexion partagée via `redisConnection` depuis `config/env.js`.
   - **Nouveau worker** : créer `*.worker.ts` + `start*.ts`, ajouter l'entry dans `ecosystem.config.cjs`.
   - **Fichiers de référence** : `apps/backend/src/workers/episodeSync.worker.ts`, `apps/backend/src/workers/startEpisodeSyncWorker.ts`.
   - **Workers existants** : import, episodeSync, notification, traktSync, usernameFix, newsSync, reengagement, activationNudge, banScheduler, scheduledSend, email, moderation, statusMonitor.
16. **Scrollabilité (mobile & web)** : toute page ou composant doit être vérifié pour la scrollabilité, surtout s'il traite des données dynamiques (listes, contenu variable, états de chargement/erreur).
   - **Screens avec contenu dynamique** : utiliser `ScrollView`, `FlatList` ou `SectionList` comme conteneur principal pour permettre le scroll quand le contenu dépasse l'écran.
   - **Screens avec contenu fixe court** : si le contenu est statique et tient toujours dans l'écran, un `ScrollView` est optionnel mais recommandé par sécurité (changement de langue, rotation, accessibilité).
   - **Composants internes scrollables** : si un composant peut recevoir des données dynamiques (liste d'éléments, commentaires, etc.), s'assurer qu'il a son propre scroll ou qu'il s'intègre dans le scroll du parent.
   - **Web** : sur desktop, vérifier que le contenu ne déborde pas sans scroll possible. Le `ScrollView` natif se comporte comme un `div` scrollable sur web — pas de régression.
   - **Checklist** : à la création ou modification d'une page/composant, vérifier : (1) le contenu peut-il dépasser la hauteur disponible ? (2) si oui, y a-t-il un conteneur scrollable ? (3) tester avec beaucoup de données et avec peu de données.
   - Fichiers de référence : `apps/mobile/src/screens/SeriesScreen.tsx` (FlatList), `apps/mobile/src/screens/ShowDetailScreen.tsx` (ScrollView), `apps/mobile/src/screens/SearchScreen.tsx` (FlatList).

15. **Sécurité & fiabilité** :
   - Toute route `POST`/`PATCH`/`DELETE` validée avec Zod.
   - JWT : access 15 min, refresh 7-30 j stocké en DB avec révocation possible.
   - Pas de secret en dur : `.env` obligatoire, crash au démarrage si variable manquante.
   - Rate limiting sur auth et import.
   - Format d'erreur API cohérent : `{ error: { code, message } }`. Pas de stack trace en prod.

## Procédure de traduction

Le script `packages/i18n-languages/scripts/translate.ts` automatise la traduction des locales via l'API LibreTranslate self-hosted (`https://translate.watchr.me`).

### Configuration

- Variables d'environnement dans `packages/i18n-languages/.env` :
  - `LIBRETRANSLATE_URL` : endpoint de l'API (ex: `https://translate.watchr.me/translate`)
  - `LIBRETRANSLATE_KEY` : clé API
- L'anglais (`en.ts`) est **toujours** la source de truth pour les clés et valeurs de référence.

### Protection des placeholders et brand names

Le script protège automatiquement avant traduction :
1. **Variables de template** `{{...}}` (ex: `{{count}}`, `{{date}}`, `{{title}}`) — remplacées par des balises HTML opaques `<x id="N"></x>` avant envoi à l'API, restaurées après. LibreTranslate en mode `format: "html"` préserve les balises verbatim.
2. **Brand names** (case-sensitive, mot entier) : `Watchr`, `TMDB`, `Google`, `Trakt`, `IMDb`, `Letterboxd`, `TV Time`, `SIRET` — même mécanisme de placeholder HTML.
3. **Clés exclues** (`DO_NOT_TRANSLATE_KEYS` dans le script) : `common.appName`, `screens.home.title`, `maintenance.title`, `screens.export.watchrJson`, `screens.export.watchrCsv` — la valeur English est copiée telle quelle, jamais traduite.

### Ajouter une nouvelle langue

1. Ajouter le code langue dans `packages/i18n-languages/src/index.ts` : `SUPPORTED_LANGUAGES`, `LANGUAGE_LABELS`, `LANGUAGE_COUNTRY_CODES`, `LANGUAGE_FLAGS`, `LANGUAGE_I18N_KEYS`, `DATE_FNS_LOCALE_LOADERS`.
2. Ajouter la clé i18n du nom de langue dans `apps/mobile/src/i18n/locales/en.ts` (ex: `languageXxx: "Xxx"`) et dans **tous** les autres fichiers de locale.
3. Lancer la traduction : `pnpm --filter @watchr/i18n-languages translate --app mobile --target <lang>` (idem pour `backend` et `landing`).
4. Ajouter l'import du nouveau locale dans :
   - `apps/mobile/src/i18n/translations.ts`
   - `apps/backend/src/i18n/translations.ts`
   - `apps/landing/src/i18n/config.ts` (lazy loader)
5. Si landing : ajouter l'import du drapeau dans `apps/landing/src/components/shared/LanguageSwitcher.tsx` (imports individuels, pas de `import.meta.glob` — `country-flag-icons` utilise des exports stricts).
6. Vérifier : 0 tag `<x>` résiduel, variables `{{}}` préservées, brand names intacts.
7. Build : `pnpm --filter landing build` et `pnpm --filter backend build` doivent passer sans erreur.

### Ajouter / modifier / supprimer des clés de traduction

> **⚠️ RÈGLE ABSOLUE** : L'IA ne modifie **JAMAIS** manuellement un fichier de locale autre que `en.ts`.
> Les 13 autres langues sont gérées **exclusivement** par le script `sync`.
> Ne pas traduire manuellement. Ne pas copier-coller des traductions. Ne pas éditer `fr.ts`, `es.ts`, etc.

**Procédure obligatoire étape par étape** :

1. **Modifier `en.ts` uniquement** — ajouter, modifier ou supprimer la clé dans `apps/<app>/src/i18n/locales/en.ts` pour chaque app concernée (mobile, backend, landing selon le scope).
2. **Lancer le sync** — `pnpm --filter @watchr/i18n-languages sync --app <app>` (sync les 13 langues) ou `--target fr,es` (langues spécifiques).
3. **Vérifier le résumé** — le script affiche `+N missing, -M obsolete, K preserved`. Si `0 missing, 0 obsolete` → rien à faire, les langues sont déjà à jour.
4. **Optionnel : `--dry-run`** — pour preview le diff avant d'appliquer.
5. **Clés non-traduisibles** — si la clé ne doit **pas** être traduite (nom d'app, format technique, header HTTP, etc.), l'ajouter à `DO_NOT_TRANSLATE_KEYS` dans **les deux** scripts : `packages/i18n-languages/scripts/translate.ts` **et** `packages/i18n-languages/scripts/sync-translations.ts`.
   - **⚠️ AVANT de lancer le sync** : toujours vérifier si la nouvelle clé contient une valeur universelle/technique (ex: `Authorization: Bearer ...`, `Trakt JSON`, `IMDb CSV`, nom d'app, nom de format). Si oui, l'ajouter aux `DO_NOT_TRANSLATE_KEYS` **avant** de lancer le sync, sinon LibreTranslate traduira absurdement la valeur (ex: `Bearer` → `porteur` en français, `JSON` → `贾森` en chinois).
6. **Brand names / variables `{{}}`** — le script protège automatiquement `Watchr`, `TMDB`, `Google`, etc. et les variables `{{count}}`. Vérifier après sync qu'aucun tag `<x>` résiduel n'est présent.

**Erreurs fréquentes à éviter** :
- ❌ Éditer manuellement `fr.ts` ou un autre locale non-anglais → utiliser le sync
- ❌ Oublier de lancer le sync après avoir modifié `en.ts` → les autres langues sont désynchronisées
- ❌ Lancer le sync sur la mauvaise app (ex: `--app mobile` alors que la clé est dans `backend`)
- ❌ Modifier `en.ts` dans une app sans modifier dans les autres apps concernées → parité obligatoire entre apps
- ❌ Oublier d'ajouter une clé technique/universelle aux `DO_NOT_TRANSLATE_KEYS` avant le sync → LibreTranslate traduit absurdement la valeur (ex: `Authorization: Bearer` → `Autorisation : porteur`, `JSON` → `贾森`)

### Re-traduire entièrement une langue

1. Supprimer le fichier locale : `rm apps/<app>/src/i18n/locales/<lang>.ts`
2. Supprimer le cache : `rm apps/<app>/src/i18n/locales/.translate-cache-<lang>.json`
3. Re-lancer : `pnpm --filter @watchr/i18n-languages translate --app <app> --target <lang>`
4. Vérifier : 0 tag `<x>`, variables `{{}}` préservées, brand names intacts, clés exclues = valeur EN.

### Fichiers clés

- `packages/i18n-languages/src/index.ts` : source of truth (langues, labels, flags, date-fns)
- `packages/i18n-languages/scripts/translate.ts` : script de traduction from scratch (LibreTranslate, protection placeholders)
- `packages/i18n-languages/scripts/sync-translations.ts` : script de sync incrémental (détecte missing/obsolete, traduit le delta)
- `packages/i18n-languages/.env` : configuration API
- `apps/mobile/src/i18n/translations.ts` : imports + exports des locales mobile
- `apps/backend/src/i18n/translations.ts` : imports + exports des locales backend
- `apps/landing/src/i18n/config.ts` : config i18next + lazy loaders landing
- `apps/landing/src/components/shared/LanguageSwitcher.tsx` : drapeaux (imports individuels)

## Règles de comportement et de génération de code

- **Assistant senior** : direct, précis. Si une approche est risquée ou sous-optimale, le dire clairement et proposer une alternative justifiée.
- **Langue** : communiquer en français avec l'humain. Code et commentaires en anglais.
- **Ne jamais inventer** un comportement technique incertain. Inspecter le code, poser une question, ou documenter un `[?]` explicite — puis le résoudre avant merge.
- **Code production-ready** : lisible, performant, sécurisé, gestion d'erreurs (try/catch sur I/O, validation des entrées).
- **Interdit** : placeholders (`TODO`, `// ...`, fausses implémentations, mocks non signalés) dans du code livré comme final.
- **Correction/réécriture** de fichier = fichier complet retourné, jamais un diff partiel.
- **Composants fonctionnels**, `const` par défaut, composition > héritage.
- **Fichiers de composants ≤ 300 lignes.** Si dépassement, extraire agressivement (sous-composants, hooks custom).

## Principes transversaux

- **Mobile = source of truth** par rapport aux autres apps.
- **Screens ≤ 300-400 lignes si possible.** Extraire dès que possible (sous-composants, hooks custom, sections). Si l'extraction n'est pas possible ou pertinente, ne rien faire.
- Utiliser tous les **MCP** pertinents pour la demande.
- Mettre en place des logiques **optimistic** et une UX moderne.
- **Prefetch au bootstrap** : toujours `fetchQuery` + cleanup explicite (`removeQueries`) pour tout prefetch au bootstrap, jamais `prefetchQuery` seul si on veut détecter l'échec (`prefetchQuery` ne rejette jamais sa promesse — l'erreur reste en cache sans déclencher le cleanup).

## Definition of Done

- [ ] Code sans placeholder ni `console.log` de debug oublié.
- [ ] Erreurs et edge cases gérés (réseau down, 401/403, données vides, import malformé).
- [ ] Hypothèses non confirmées documentées avec `[?]` dans la description du changement.
- [ ] Remote Config : nouvelle valeur runtime ajoutée à `DEFAULT_REMOTE_CONFIG`, seedée, aucune URL backend hardcodée.
- [ ] Web : `pnpm --filter mobile web` sans crash, guards `Platform.OS`, layout responsive.
- [ ] Admin : si touché, `pnpm --filter admin dev` sans crash, routes validées Zod, pas de régression backend.
- [ ] Landing : si touché, `pnpm --filter landing dev` sans crash, i18n parité 14 langues, SEO meta à jour.
- [ ] Mobile : pas de régression iOS/Android.
- [ ] Translations : `en.ts` modifié uniquement, sync lancé pour chaque app concernée. 0 tag `<x>` résiduel, variables `{{}}` préservées, brand names intacts, clés `DO_NOT_TRANSLATE_KEYS` = valeur EN. **Aucun fichier de locale non-anglais édité manuellement par l'IA.**
- [ ] Translations : toute nouvelle clé avec une valeur universelle/technique (header HTTP, nom de format, nom d'app) a été identifiée et ajoutée aux `DO_NOT_TRANSLATE_KEYS` **avant** le sync.
- [ ] Pas d'usage de `Alert.alert()` / `Alert.prompt()` natif — utiliser `CustomAlert` via `useUIStore.showAlert()`.
- [ ] Clavier mobile : tout `TextInput` a une gestion clavier explicite (`KeyboardAwareScrollView`, `useKeyboardHandler` + spacer, ou `keyboardShouldPersistTaps`/`keyboardDismissMode` sur ScrollView/FlatList parent).
- [ ] Scrollabilité : toute page/composant avec données dynamiques a un conteneur scrollable (`ScrollView`/`FlatList`/`SectionList`). Vérifié avec beaucoup et peu de données.
- [ ] Mobile = source of truth.
- [ ] Workers : toute tâche planifiée utilise BullMQ (pas de `node-cron`/`setInterval`). Nouveau worker = `*.worker.ts` + `start*.ts` + entry dans `ecosystem.config.cjs`.
- [ ] MCP pertinents utilisés.
- [ ] Logiques optimistic UI/UX mises en place.
