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
| Landing i18n | react-i18next (7 langues) |
| Landing SEO | react-helmet-async + JSON-LD |
| Emails | React Email (@react-email/components + @react-email/render) |

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
│       │   ├── i18n/                  # config + locales/ (7 langues)
│       │   ├── lib/                   # utils
│       │   ├── assets/                # splash backgrounds, images
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/                    # favicon, icons, og-image, robots.txt, sitemap.xml
│       ├── package.json
│       └── vite.config.ts
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
5. **Internationalisation** : `en` et `fr`. Tout texte UI mobile passe par `useI18n`/`t()`. Dates via `date-fns` + `dateFnsLocale`. Messages d'erreur API via `useErrorMessage`. Traductions dans `apps/mobile/src/i18n/locales/<lang>.ts` (mobile) et `apps/backend/src/i18n/locales/<lang>.ts` (backend). Toute clé/modification doit être répercutée dans **tous** les fichiers de locale (`en.ts`, `fr.ts`, etc.) des deux côtés — parfaite parité obligatoire.
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
   - i18n : 7 langues (en, fr, ar, de, es, it, pt). RTL pour l'arabe. Traductions dans `apps/landing/src/i18n/locales/<lang>.ts`. Parité parfaite entre tous les fichiers de locale.
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
13. **Sécurité & fiabilité** :
   - Toute route `POST`/`PATCH`/`DELETE` validée avec Zod.
   - JWT : access 15 min, refresh 7-30 j stocké en DB avec révocation possible.
   - Pas de secret en dur : `.env` obligatoire, crash au démarrage si variable manquante.
   - Rate limiting sur auth et import.
   - Format d'erreur API cohérent : `{ error: { code, message } }`. Pas de stack trace en prod.

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
- [ ] Landing : si touché, `pnpm --filter landing dev` sans crash, i18n parité 7 langues, SEO meta à jour.
- [ ] Mobile : pas de régression iOS/Android.
- [ ] Translations : tous les fichiers de locale mobile, backend et landing restent en parité.
- [ ] Pas d'usage de `Alert.alert()` / `Alert.prompt()` natif — utiliser `CustomAlert` via `useUIStore.showAlert()`.
- [ ] Mobile = source of truth.
- [ ] MCP pertinents utilisés.
- [ ] Logiques optimistic UI/UX mises en place.
