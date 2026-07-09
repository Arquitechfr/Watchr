# AGENTS.md — Watchr

> [?] "Watchr" est un nom de code placeholder. Renommer avant tout déploiement public (vérifier dispo domaine/store).

## Contexte

Watchr est un tracker de séries/films (successeur perso de TV Time, qui ferme le 15/07/2026).
MVP scope : tracking watch-status + notes/ratings + commentaires publics sur shows/épisodes, import prioritaire des exports GDPR TV Time.

Délai : livraison MVP avant le 15/07/2026.

## Stack

| Domaine | Choix |
|---|---|
| Backend runtime | Node.js ESM |
| Backend framework | Express.js |
| BDD | MongoDB + Mongoose |
| Auth | JWT (access + refresh) |
| Validation | Zod (backend et frontend) |
| Mobile | React Native + Expo (dev client, **prebuild autorisé**) |
| État mobile | Zustand + TanStack Query |
| Navigation mobile | React Navigation (native-stack, bottom-tabs) |
| Réseau mobile | Axios |
| Stockage local mobile | expo-secure-store (tokens), AsyncStorage (cache léger) |
| Style mobile | NativeWind |
| Web (same app) | react-native-web via Expo Web (`expo start --web`) |
| Style web | NativeWind + Tailwind breakpoints (`md:`, `lg:`) |
| Package manager | pnpm exclusivement |
| Lint/Format | ESLint + Prettier |
| Tests | Vitest |

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
├── pnpm-workspace.yaml
└── AGENTS.md
```

## Commandes

- Install : `pnpm install` (à la racine, workspace)
- Backend dev : `pnpm --filter backend dev`
- Mobile dev : `pnpm --filter mobile start` (dev client Expo, prebuild autorisé)
- Web dev : `pnpm --filter mobile web` (expo start --web, react-native-web)
- Web build : `npx expo export --platform web --output-dir dist` (depuis apps/mobile)
- Remote config CLI : `pnpm --filter backend mobile-config set <key> <value> [type]` (types: string, number, boolean, json)
- Remote config list : `pnpm --filter backend mobile-config list`
- Remote config seed : `pnpm --filter backend mobile-config:seed` (peuple avec les valeurs par défaut)

## URLs de production

- **Site web (landing page)** : https://watchr.me
- **Web app (Expo Web, version desktop de l'app mobile)** : https://app.watchr.me
- **API backend** : https://api.watchr.me

## Contraintes et principes actifs

1. **Modules natifs côté mobile.** Les libs nécessitant du code natif doivent avoir un config plugin Expo officiel. Le prebuild est autorisé (dev client Expo). Signaler avant d'ajouter une lib nécessitant du code natif custom.
2. **pnpm uniquement**, jamais npm/yarn/bun dans les commandes ou la doc.
3. **Sources de données** : TMDB est la source de données principale. Le parser d'import GDPR TV Time reste tolérant (détection de colonnes par header) et produit un rapport d'erreurs ligne par ligne.
4. **Planification obligatoire** : toute nouvelle feature ou changement architectural doit faire l'objet d'un plan validé avant implémentation.
5. **Internationalisation (i18n)** : l'application supporte `en` et `fr`.
   - Côté mobile, tout texte UI doit passer par `useI18n` et `t()` (interdiction de laisser du texte en dur dans les composants/écrans).
   - Les fichiers de traduction sont splités par langue, côté mobile **et** backend :
     - Mobile : `apps/mobile/src/i18n/locales/<lang>.ts` (agrégés dans `translations.ts`)
     - Backend : `apps/backend/src/i18n/locales/<lang>.ts` (agrégés dans `translations.ts`)
   - Les dates et formats localisés utilisent `date-fns` avec la locale dynamique fournie par `useI18n` (`dateFnsLocale`).
   - Les messages d'erreur API utilisent le hook `useErrorMessage` ; les messages snackbar utilisent des clés de traduction.
   - **Synchronisation obligatoire** : toute nouvelle clé ou modification de traduction doit être répercutée dans **tous** les fichiers de locale (`en.ts`, `fr.ts`, et toute autre langue supportée) côté mobile **et** backend. Les fichiers doivent rester en parité parfaite. Une tâche n'est pas terminée tant que toutes les langues ne sont pas à jour.
   - **Synchronisation obligatoire** : toute nouvelle clé ou modification de traduction doit être répercutée dans **tous** les fichiers de locale (`en.ts`, `fr.ts`, et toute autre langue supportée) côté mobile **et** backend. Les fichiers doivent rester en parité parfaite. Une tâche n'est pas terminée tant que toutes les langues ne sont pas à jour.
   - **mobile** is **Source of truth** par rapport au autres. 
   - Utilisez tous les MCP que vous jugez pertinents pour votre demande.
   - Toujours mettre en place des logiques optimistic pour l'utilisateur via du UI et UX moderne.
6. **Compatibilité Web (Expo Web)** : l'app mobile Expo sert également de web app desktop via `react-native-web`. Toute nouvelle page, composant ou logique doit être compatible web.
   - **Guards `Platform.OS`** : tout usage de module natif (`expo-notifications`, `expo-secure-store`, `expo-file-system`, `expo-sharing`, `react-native-android-widget`, etc.) doit être conditionné par `Platform.OS !== 'web'` ou abstrait derrière un wrapper cross-platform (ex: `secureStorage`).
   - **Layout responsive** : tout écran doit utiliser des breakpoints Tailwind (`md:`, `lg:`) ou `useWindowDimensions()` pour s'adapter au desktop. Les bottom tabs deviennent une sidebar sur large screen.
   - **Stockage web** : `expo-secure-store` n'existe pas sur web → utiliser l'abstraction `src/utils/secureStorage.ts` (localStorage fallback). Jamais importer `expo-secure-store` directement hors de ce wrapper.
   - **Navigation web** : le linking `watchr://` ne fonctionne pas sur web. Les paths URL browser doivent être configurés dans le `linking` config de React Navigation.
   - **Pas de régression mobile** : les adaptations web ne doivent jamais modifier le comportement mobile existant. Tout guard web doit préserver le flow native intact.
   - **Test web** : vérifier `pnpm --filter mobile web` lance sans crash avant de considérer une tâche terminée.