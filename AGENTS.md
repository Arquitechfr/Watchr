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
| Web (desktop) | ViteJS + React 19 + React Router |
| État mobile & web | Zustand + TanStack Query |
| Navigation mobile | React Navigation (native-stack, bottom-tabs) |
| Navigation web | React Router DOM |
| Réseau mobile & web | Axios |
| Stockage local mobile | expo-secure-store (tokens), AsyncStorage (cache léger) |
| Stockage local web | localStorage (tokens), sessionStorage (cache léger) |
| Style mobile | NativeWind |
| Style web | TailwindCSS |
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
│   │   └── package.json
│   └── web/                      # Version desktop ViteJS du mobile
│       ├── src/
│       │   ├── pages/            # Équivalent des screens mobile
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── store/
│       │   ├── i18n/
│       │   └── theme/
│       └── package.json
├── pnpm-workspace.yaml
└── AGENTS.md
```

## Commandes

- Install : `pnpm install` (à la racine, workspace)
- Backend dev : `pnpm --filter backend dev`
- Mobile dev : `pnpm --filter mobile start` (dev client Expo, prebuild autorisé)
- Web dev : `pnpm --filter web dev` (ViteJS dev server)
- Remote config CLI : `pnpm --filter backend mobile-config set <key> <value> [type]` (types: string, number, boolean, json)
- Remote config list : `pnpm --filter backend mobile-config list`
- Remote config seed : `pnpm --filter backend mobile-config:seed` (peuple avec les valeurs par défaut)

## URLs de production

- **Site web** : https://watchr.me
- **API backend** : https://api.watchr.me

## Contraintes et principes actifs

1. **Modules natifs côté mobile.** Les libs nécessitant du code natif doivent avoir un config plugin Expo officiel. Le prebuild est autorisé (dev client Expo). Signaler avant d'ajouter une lib nécessitant du code natif custom.
2. **pnpm uniquement**, jamais npm/yarn/bun dans les commandes ou la doc.
3. **Sources de données** : TMDB est la source de données principale. Le parser d'import GDPR TV Time reste tolérant (détection de colonnes par header) et produit un rapport d'erreurs ligne par ligne.
4. **Planification obligatoire** : toute nouvelle feature ou changement architectural doit faire l'objet d'un plan validé avant implémentation.
5. **Synchronisation web ↔ mobile obligatoire** : le dossier `apps/web` est la version desktop (ViteJS + React) de l'application mobile `apps/mobile`. Les deux applications partagent la même logique métier, les mêmes écrans/pages, les mêmes hooks et services. Toute nouvelle fonctionnalité, tout nouvel écran, toute nouvelle logique métier (hook, service, store) doit être implémentée **simultanément** côté mobile **et** côté web. Les deux versions doivent rester en parité fonctionnelle. Une tâche n'est pas terminée tant que les deux plateformes ne sont pas synchronisées.
6. **Internationalisation (i18n)** : l'application supporte `en` et `fr`.
   - Côté mobile, tout texte UI doit passer par `useI18n` et `t()` (interdiction de laisser du texte en dur dans les composants/écrans).
   - Les fichiers de traduction sont splités par langue, côté mobile **et** backend :
     - Mobile : `apps/mobile/src/i18n/locales/<lang>.ts` (agrégés dans `translations.ts`)
     - Backend : `apps/backend/src/i18n/locales/<lang>.ts` (agrégés dans `translations.ts`)
   - Les dates et formats localisés utilisent `date-fns` avec la locale dynamique fournie par `useI18n` (`dateFnsLocale`).
   - Les messages d'erreur API utilisent le hook `useErrorMessage` ; les messages snackbar utilisent des clés de traduction.
   - **Synchronisation obligatoire** : toute nouvelle clé ou modification de traduction doit être répercutée dans **tous** les fichiers de locale (`en.ts`, `fr.ts`, et toute autre langue supportée) côté mobile **et** backend. Les fichiers doivent rester en parité parfaite. Une tâche n'est pas terminée tant que toutes les langues ne sont pas à jour.
   - **Synchronisation obligatoire** : toute nouvelle clé ou modification de traduction doit être répercutée dans **tous** les fichiers de locale (`en.ts`, `fr.ts`, et toute autre langue supportée) côté mobile **et** backend. Les fichiers doivent rester en parité parfaite. Une tâche n'est pas terminée tant que toutes les langues ne sont pas à jour.