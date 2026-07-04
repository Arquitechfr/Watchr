# Plan de déploiement PM2 - Backend Watchr

## Prérequis serveur

- Node.js 20+ installé sur le serveur
- pnpm installé globalement sur le serveur : `npm install -g pnpm`
- MongoDB accessible (local ou distant)
- Redis accessible (local ou distant)
- PM2 installé globalement sur le serveur : `npm install -g pm2`
- Accès SSH au serveur

## Configuration des variables d'environnement

Créer un fichier `.env` dans `apps/backend/` avec les variables suivantes :

```env
NODE_ENV=production
PORT=4500
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

**Important** : Ne jamais commit le fichier `.env`. Ajoutez-le au `.gitignore`.

## Processus de déploiement

### Méthode recommandée : Build local + transfert

Cette méthode est la plus simple et la plus fiable pour la production.

#### 1. Build du projet (en local)

```bash
# À la racine du workspace
pnpm install
pnpm --filter backend build
```

#### 2. Fichiers à transférer sur le serveur

Transférer uniquement ces fichiers/dossiers vers `/var/www/watchr/backend/` (ou votre chemin) :

**Fichiers requis :**
- `package.json` - Dépendances
- `package-lock.yaml` - Versions exactes des dépendances
- `ecosystem.config.cjs` - Configuration PM2 (extension .cjs car le projet est en ESM)
- `.env` - Variables d'environnement (créé manuellement sur le serveur)
- `dist/` - Dossier contenant le code compilé (tout le dossier)

**Dossiers optionnels mais recommandés :**
- `uploads/` - Dossier pour les uploads (créer avec permissions d'écriture)
- `logs/` - Dossier pour les logs PM2 (créer avec permissions d'écriture)

**Ne PAS transférer :**
- `node_modules/` - Installé sur le serveur
- `src/` - Code source (non compilé)
- `tests/` - Tests (inutiles en prod)
- `scripts/` - Scripts de dev/diagnostic (inutiles en prod)
- `dist/scripts/` - Scripts compilés (inutiles en prod)
- `dist/tests/` - Tests compilés (inutiles en prod)
- `.cache/` - Cache de build
- `tsconfig.json` - Config TypeScript (inutile en prod)

#### 3. Nettoyage du dossier dist (optionnel mais recommandé)

```bash
# Supprimer les dossiers inutiles avant transfert
rm -rf apps/backend/dist/scripts
rm -rf apps/backend/dist/tests
```

#### 4. Transfert via SCP (exemple)

```bash
# Depuis votre machine locale
scp -r apps/backend/dist user@your-server:/var/www/watchr/backend/
scp apps/backend/package.json user@your-server:/var/www/watchr/backend/
scp apps/backend/package-lock.yaml user@your-server:/var/www/watchr/backend/
scp apps/backend/ecosystem.config.cjs user@your-server:/var/www/watchr/backend/

# Créer les dossiers nécessaires sur le serveur
ssh user@your-server
mkdir -p /var/www/watchr/backend/uploads
mkdir -p /var/www/watchr/backend/logs
```

#### 4. Installation des dépendances (sur le serveur)

```bash
# SSH sur le serveur
ssh user@your-server
cd /var/www/watchr/backend

# Installer les dépendances
pnpm install --prod
```

#### 5. Création du fichier .env (sur le serveur)

```bash
# Créer le fichier .env avec les variables de production
nano .env
# ou vim .env
```

#### 6. Démarrage avec PM2 (sur le serveur)

```bash
# Démarrer les processus
pm2 start ecosystem.config.js --env production

# Sauvegarder la configuration
pm2 save

# Configurer le démarrage automatique
pm2 startup
```

### 7. Vérification de l'état

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

## Processus de mise à jour

### Méthode recommandée : Zero-downtime reload

```bash
# 1. Build en local
pnpm --filter backend build

# 2. Transférer le dossier dist sur le serveur
scp -r apps/backend/dist user@your-server:/var/www/watchr/backend/

# 3. Reload gracieux sur le serveur (sans arrêt)
ssh user@your-server
cd /var/www/watchr/backend
pm2 reload ecosystem.config.js --env production
```

### Méthode alternative : Redémarrage complet

```bash
# 1. Build en local
pnpm --filter backend build

# 2. Transférer le dossier dist sur le serveur
scp -r apps/backend/dist user@your-server:/var/www/watchr/backend/

# 3. Arrêt et redémarrage sur le serveur
ssh user@your-server
cd /var/www/watchr/backend
pm2 stop ecosystem.config.js
pm2 start ecosystem.config.js --env production
pm2 save
```

## Gestion des logs

Les logs sont stockés dans `/var/www/watchr/backend/logs/` (sur le serveur) :

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

Pour le développement, utilisez plutôt `pnpm --filter backend dev` qui utilise tsx en watch mode.

Si vous voulez tout de même utiliser PM2 en dev :

```bash
# Build (optionnel en dev, tsx peut compiler à la volée)
pnpm --filter backend build

# Démarrage avec PM2 en mode dev
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
