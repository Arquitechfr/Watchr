# Watchr

Tracker personnel de séries et films — tracking, notes, commentaires et import d'exports TV Time.

## Structure du repo

| Package | Description |
|---|---|
| `apps/backend` | API Express + MongoDB |
| `apps/mobile` | App mobile + web (Expo / React Native) |
| `apps/admin` | Backoffice (Vite + React) |
| `apps/landing` | Site vitrine (Vite + React) |
| `packages/i18n-languages` | Package partagé i18n (14 langues) |

## Prérequis

- Node.js >= 20
- pnpm
- MongoDB en local (ou adapter `.env`)

## Installation

```bash
pnpm install
```

## Démarrage

```bash
# Backend
pnpm --filter backend dev

# Mobile / Web
pnpm --filter mobile start
pnpm --filter mobile web

# Admin
pnpm --filter admin dev

# Landing
pnpm --filter landing dev
```

## Tests

```bash
pnpm --filter backend test
```

## Lint

```bash
pnpm --filter backend lint
pnpm --filter mobile lint
```
