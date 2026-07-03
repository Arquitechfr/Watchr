# Prochaines étapes — Backend Watchr

## 1. Configuration locale

1. Copier le fichier d'exemple :
   ```bash
   cp .env.example .env
   ```

2. Renseigner les variables dans `.env` :
   - `MONGO_URI` — URI de la base MongoDB isolée (ex. `mongodb://localhost:27017/watchr`).
   - `REDIS_URL` — URI Redis (ex. `redis://localhost:6379`).
   - `JWT_ACCESS_SECRET` — secret long et aléatoire.
   - `JWT_REFRESH_SECRET` — secret différent du précédent.
   - `TMDB_API_KEY` — clé API TMDB (Bearer token du compte).
   - `TVDB_API_KEY` — clé API TheTVDB v4 (optionnelle mais recommandée pour le fallback).
   - `PORT` — port d'écoute, configurable pour éviter les conflits avec Pato/Kloopa.

## 2. Démarrage des services

```bash
# API HTTP
pnpm --filter backend dev

# Worker d'import GDPR (processus séparé)
pnpm --filter backend worker

# Worker de sync quotidienne des épisodes (processus séparé)
pnpm --filter backend sync
```

## 3. Vérification rapide

```bash
# Santé de l'API
curl http://localhost:4000/health

# Lint, tests, typecheck
pnpm lint
pnpm test
pnpm typecheck
```

## 4. Intégration des vraies clés API

- **TMDB** : créer une clé sur https://www.themoviedb.org/settings/api.
- **TheTVDB** : créer une clé sur https://thetvdb.com/dashboard/account/apikey.

Sans clés, les routes `/api/shows` et l'import retourneront des erreurs 502/401.

## 5. Calibrage du parser d'import TV Time

Le parser détecte les CSV par headers et supporte les variantes connues :
- `tracking-prod-records.csv`
- `tracking-prod-records-v2.csv`

Pour l'affiner :
- Fournir un export TV Time réel.
- Identifier les noms de colonnes exacts.
- Ajuster `src/services/importParser.service.ts` si de nouvelles variantes apparaissent.

## 6. Points d'attention avant release

- **Rate-limiting TMDB** : le backend utilise un token bucket calibré sur 40 req/10s (API non commerciale). À ajuster si le compte TMDB a un quota différent.
- **Redis** : les queues BullMQ partagent le même Redis. Ne pas faire tourner les workers sans Redis disponible.
- **DB isolée** : s'assurer que `MONGO_URI` pointe bien sur une base dédiée à Watchr, pas partagée avec Pato/Kloopa.

## 7. Ce qui est déjà livré

- Auth JWT (access 15min, refresh 30j, rotation, révocation multi-device).
- Cache local des shows avec resync TMDB.
- Tracking, ratings, upcoming episodes.
- Import zip → CSV → matching TMDB avec rapport d'erreurs.
- Workers BullMQ pour import et sync épisodes.
- Tests Vitest sur auth, tracking, import parser.
- Lint + typecheck passent.
