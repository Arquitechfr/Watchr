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
│   └── admin/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   │   ├── ui/                # shadcn/ui
│       │   │   ├── layout/
│       │   │   └── shared/
│       │   ├── hooks/
│       │   ├── lib/                   # api client, utils
│       │   ├── store/                 # Zustand
│       │   └── types/
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
8. **Recommandations explicites** : tout conseil technique, architectural, librairie ou pattern doit être préfixé par **`(RECOMMANDATION)`**.
9. **Remote Config** : valeurs runtime (`backend_url`, flags, etc.) dans MongoDB `mobile_config`, endpoint public `GET /internal/mobile-config` (cache 30s côté backend).
   - Mobile : `remoteConfigService` init bloquant, cache AsyncStorage, refresh 5 min + foreground.
   - Écriture = CLI (`pnpm --filter backend mobile-config set ...`) ou API admin authentifiée. Jamais d'endpoint public d'écriture.
   - Lecture = endpoint public sans auth (pas de données sensibles).
   - URL backend non hardcodée : `remoteConfigService.getConfig().backend_url` ou `getApiBaseUrl()`.
   - Build-time vars (Firebase, EAS, Sentry) restent dans `.env`.
   - Nouvelle valeur runtime : ajouter à `DEFAULT_REMOTE_CONFIG`, seeder MongoDB, documenter dans le plan.

## Principes transversaux

- **Mobile = source of truth** par rapport aux autres apps.
- Utiliser tous les **MCP** pertinents pour la demande.
- Mettre en place des logiques **optimistic** et une UX moderne.

## Definition of Done

- [ ] Code sans placeholder ni `console.log` de debug oublié.
- [ ] Erreurs et edge cases gérés (réseau down, 401/403, données vides, import malformé).
- [ ] Hypothèses non confirmées documentées avec `[?]` dans la description du changement.
- [ ] Remote Config : nouvelle valeur runtime ajoutée à `DEFAULT_REMOTE_CONFIG`, seedée, aucune URL backend hardcodée.
- [ ] Web : `pnpm --filter mobile web` sans crash, guards `Platform.OS`, layout responsive.
- [ ] Admin : si touché, `pnpm --filter admin dev` sans crash, routes validées Zod, pas de régression backend.
- [ ] Mobile : pas de régression iOS/Android.
- [ ] Translations : tous les fichiers de locale mobile et backend restent en parité.
