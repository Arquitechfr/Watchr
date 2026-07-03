# Plan de déploiement PM2 - Backend Watchr

## Prérequis

- Node.js 20+
- pnpm installé globalement
- MongoDB accessible
- Redis accessible
- PM2 installé globalement : `pnpm add -g pm2` ou `npm install -g pm2`

## Configuration des variables d'environnement

Créer un fichier `.env` dans `apps/backend/` avec les variables suivantes :

```env
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb://localhost:27017/watchr
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
TMDB_API_KEY=your_tmdb_key
TVDB_API_KEY=your_tvdb_key
TVDB_PIN=your_tvdb_pin
FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_key
CORS_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
```

## Processus de déploiement

### 1. Build du projet

```bash
# À la racine du workspace
pnpm install
pnpm --filter backend build
```

### 2. Démarrage avec PM2

```bash
# Dans apps/backend/
pm2 start ecosystem.config.js --env production
```

### 3. Vérification de l'état

```bash
# Voir tous les processus
pm2 status

# Voir les logs
pm2 logs

# Logs spécifiques
pm2 logs watchr-api
pm2 logs watchr-import-worker
pm2 logs watchr-episode-sync-worker
```

### 4. Sauvegarde de la configuration PM2

```bash
pm2 save
pm2 startup
```

## Processus de mise à jour

### Méthode recommandée : Zero-downtime reload

```bash
# Build
pnpm --filter backend build

# Reload gracieux (sans arrêt)
pm2 reload ecosystem.config.js --env production
```

### Méthode alternative : Redémarrage complet

```bash
# Build
pnpm --filter backend build

# Arrêt et redémarrage
pm2 stop ecosystem.config.js
pm2 start ecosystem.config.js --env production
pm2 save
```

## Gestion des logs

Les logs sont stockés dans `apps/backend/logs/` :

- `api-error.log` - Erreurs de l'API
- `api-out.log` - Sortie standard de l'API
- `import-worker-error.log` - Erreurs du worker d'import
- `import-worker-out.log` - Sortie standard du worker d'import
- `episode-sync-worker-error.log` - Erreurs du worker de sync épisodes
- `episode-sync-worker-out.log` - Sortie standard du worker de sync épisodes

### Rotation des logs

```bash
# Installer pm2-logrotate
pm2 install pm2-logrotate

# Configuration par défaut (adapter selon besoins)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Monitoring

```bash
# Monitoring en temps réel
pm2 monit

# Informations détaillées
pm2 show watchr-api
pm2 show watchr-import-worker
pm2 show watchr-episode-sync-worker
```

## Arrêt et nettoyage

```bash
# Arrêter tous les processus
pm2 stop ecosystem.config.js

# Supprimer tous les processus
pm2 delete ecosystem.config.js

# Flush des logs
pm2 flush

# Réinitialiser PM2
pm2 kill
```

## Architecture des processus

Le fichier `ecosystem.config.js` définit 3 processus :

1. **watchr-api** (cluster mode, 2 instances)
   - Serveur Express principal
   - Gère les requêtes HTTP
   - Mode cluster pour la scalabilité

2. **watchr-import-worker** (1 instance)
   - Worker BullMQ pour l'import GDPR TV Time
   - Traite les fichiers d'import en arrière-plan

3. **watchr-episode-sync-worker** (1 instance)
   - Worker BullMQ pour la synchronisation des épisodes
   - Planifie et exécute les syncs TMDB/TheTVDB

## Déploiement en environnement de développement

```bash
# Sans build (utilise tsx en watch)
pm2 start ecosystem.config.js --env development
```

## Dépannage

### Processus qui crash répétitivement

```bash
# Voir les logs d'erreur récents
pm2 logs watchr-api --err --lines 50

# Augmenter la limite de restart temporairement
pm2 reset watchr-api
```

### Problèmes de mémoire

```bash
# Voir l'utilisation mémoire
pm2 monit

# Si nécessaire, ajuster max_memory_restart dans ecosystem.config.js
```

### Connexion MongoDB/Redis échoue

Vérifier que les variables d'environnement sont correctement définies et que les services sont accessibles depuis le serveur de déploiement.
