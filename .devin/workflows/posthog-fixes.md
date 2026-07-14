---
auto_execution_mode: 2
---
# PostHog — Fixes à appliquer

Date : 2026-07-14
Projet : Watchr (id: 223410, org: ArquiTech)
Dashboard : https://eu.posthog.com/project/223410/dashboard/819503

## Contexte

Audit PostHog réalisé via MCP. 3 actions à implémenter. Le MCP PostHog avait des timeouts lors de l'audit, donc ces changements doivent être appliqués manuellement via l'UI PostHog ou en relançant le MCP plus tard.

## 1. Corriger le funnel principal Watchr

**Insight** : `262BWxgV` (id: 4996082)
**Dashboard tile** : id 5174744

### Problème

L'ordre actuel des étapes ne correspond pas au flow réel :
```
user_signed_up → onboarding_completed → Watchlist item(s) added → $screen
```

Résultat : 0% conversion à l'étape 3 car `onboarding_completed` est capturé **après** `watchlist_batch_added` dans le flow réel.

### Flow réel (d'après le code)

1. `user_signed_up` — backend `auth.service.ts` (signup/magic link)
2. `onboarding_welcome_viewed` — mobile `OnboardingWelcomeScreen.tsx`
3. `onboarding_selection_finished` — mobile `OnboardingSelectionScreen.tsx` (avec `itemsSelected`)
4. `watchlist_batch_added` — backend `tracking.service.ts` (déclenché par `addToWatchlistBatch`)
5. `onboarding_import_skipped` — mobile `OnboardingImportScreen.tsx`
6. `onboarding_completed` — backend `auth.service.ts` (`completeOnboarding`)
7. `$screen` — mobile `RootNavigator.tsx` (retour sur un écran)

### Correction

Nouvel ordre du funnel :
```
user_signed_up → watchlist_batch_added → onboarding_completed → $screen
```

### Comment

**Option A — Via l'UI PostHog** :
1. Aller sur https://eu.posthog.com/project/223410/insights/262BWxgV
2. Réordonner les étapes : `user_signed_up` → `watchlist_batch_added` → `onboarding_completed` → `$screen`
3. Sauvegarder

**Option B — Via MCP** (quand il fonctionne) :
```
posthog:exec({ "command": "call insight-update" })
avec id: "262BWxgV" et le query corrigé (FunnelsQuery, series réordonnées)
```

## 2. Supprimer les 8 insights par défaut

Ces insights auto-créés par PostHog ne sont rattachés à aucun dashboard et encombrent l'espace :

| short_id | id | Nom |
|---|---|---|
| A1tFaPiP | 4983132 | Active users (last 30 days) |
| 68oUWBDD | 4983133 | Sessions (last 7 days) |
| 5kdv2cSN | 4983134 | Pageviews (last 7 days) |
| L0McnFsI | 4983135 | Daily active users (DAUs) |
| 352fDbhG | 4983136 | Weekly active users (WAUs) |
| W72BwYZa | 4983137 | Retention |
| 8B9B2FDg | 4983138 | Top referrers |
| 4M0XdyU0 | 4983139 | Visit to interaction funnel |

### Comment

**Option A — Via l'UI PostHog** :
1. Aller sur https://eu.posthog.com/project/223410/insights
2. Pour chaque insight ci-dessus : ouvrir → Settings → Delete

**Option B — Via MCP** :
```
posthog:exec({ "command": "call insight-delete" }) pour chaque id
```

## 3. Activer session replay (web)

Aucun session recording trouvé sur les 30 derniers jours.

### Vérification

1. Aller sur https://eu.posthog.com/project/223410/settings/session-recording
2. Vérifier que "Record user sessions" est activé
3. Vérifier le sample rate (recommandé : 100% en prod initiale, ajuster ensuite)
4. Pour le web (`app.watchr.me`) : le SDK `posthog-react-native` avec `react-native-web` devrait capturer les sessions si activé

### Note

Le SDK mobile (`posthog-react-native`) supporte le session replay sur iOS/Android depuis la v2+. Vérifier la version installée :
```bash
pnpm --filter mobile posthog-react-native --version
```

## État actuel des données (2026-07-14)

### Events custom actifs (30 derniers jours)
| Event | Count | Source |
|---|---|---|
| `user_signed_up` | 4 | backend |
| `onboarding_completed` | 4 | backend |
| `onboarding_welcome_viewed` | 3 | mobile |
| `onboarding_skipped_from_welcome` | 2 | mobile |
| `onboarding_selection_finished` | 1 | mobile |
| `onboarding_import_skipped` | 1 | mobile |
| `watchlist_batch_added` | 2 | backend |
| `push_token_registered` | 8 | backend |
| `push_permission_result` | 6 | mobile |

### Events trackés dans le code mais pas encore déclenchés
- `onboarding_selection_skipped` — `OnboardingSelectionScreen.tsx:277`
- `onboarding_import_attempted` — `OnboardingImportScreen.tsx:133`
- `watchlist_item_added` — `tracking.service.ts:338,450`

### Web analytics (30j)
- 5 visiteurs, 62 pageviews, 6 sessions, ~74s durée moyenne

### Feature flags
- Aucun configuré

### Actions
- 1 action : "Watchlist item(s) added" (id: 144160) — matche `watchlist_item_added` OR `watchlist_batch_added`

## Fichiers code pertinents

- `apps/mobile/App.tsx:88-91` — PostHogProvider init
- `apps/mobile/src/navigation/RootNavigator.tsx:100,259` — identify + $screen capture
- `apps/mobile/src/hooks/usePushNotifications.ts:66` — push_permission_result
- `apps/mobile/src/screens/onboarding/OnboardingWelcomeScreen.tsx:28,32` — onboarding events
- `apps/mobile/src/screens/onboarding/OnboardingSelectionScreen.tsx:54,59,277` — selection events
- `apps/mobile/src/screens/onboarding/OnboardingImportScreen.tsx:61,133` — import events
- `apps/backend/src/lib/posthog.ts:4-6` — posthog-node init
- `apps/backend/src/services/auth.service.ts:97,164,223,536,596` — user_signed_up, push_token_registered, onboarding_completed
- `apps/backend/src/services/tracking.service.ts:338,379,450` — watchlist events
