# AGENTS.md — Watchr

> [?] "Watchr" est un nom de code placeholder. Renommer avant tout déploiement public (vérifier dispo domaine/store).

## Contexte

Watchr est un tracker de séries/films (successeur perso de TV Time, qui ferme le 15/07/2026).
MVP scope : tracking watch-status + notes/ratings, **pas de social**, import prioritaire des exports GDPR TV Time.

Délai : livraison MVP avant le 15/07/2026.

## Stack

| Domaine | Choix |
|---|---|
| Backend runtime | Node.js ESM |
| Backend framework | Express.js |
| BDD | MongoDB + Mongoose |
| Auth | JWT (access + refresh) |
| Validation | Zod (backend et frontend) |
| Mobile | React Native + Expo (managed workflow, **sans prebuild**) |
| État mobile | Zustand + TanStack Query |
| Navigation mobile | React Navigation (native-stack, bottom-tabs) |
| Réseau mobile | Axios |
| Stockage local mobile | expo-secure-store (tokens), AsyncStorage (cache léger) |
| Style mobile | NativeWind |
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
│   └── mobile/
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── store/
│       │   └── navigation/
│       └── package.json
├── pnpm-workspace.yaml
└── AGENTS.md
```

## Commandes

- Install : `pnpm install` (à la racine, workspace)
- Backend dev : `pnpm --filter backend dev`
- Mobile dev : `pnpm --filter mobile start` (Expo Go, pas de dev client custom sauf accord explicite)

## Contraintes non négociables

1. **Aucun module natif custom côté mobile.** Toute lib doit fonctionner en Expo Go ou avoir un config plugin Expo officiel. Si une lib nécessite du code natif custom, le signaler avant de l'ajouter — ne pas prebuild.
2. **Pas de social features** dans le MVP (following, activité publique, commentaires). Hors scope explicite.
3. **TMDB en source primaire**, TheTVDB uniquement en fallback silencieux si TMDB ne retourne rien. Pas de merge de données entre les deux sources.
4. **Import GDPR TV Time** : le format d'export a déjà changé une fois côté TV Time (confirmé sur forums Trakt). Le parser doit être tolérant (détection de colonnes par header, pas par position) et produire un rapport d'erreurs ligne par ligne, jamais un crash silencieux.
5. **pnpm uniquement**, jamais npm/yarn/bun dans les commandes ou la doc.