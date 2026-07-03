# Watchr

Tracker personnel de séries et films (MVP sans social).

## Structure

- `apps/backend` : API Express/Mongoose
- `apps/mobile` : app Expo (hors scope de ce backend)

## Prérequis

- Node.js >= 20
- pnpm
- MongoDB et Redis en local (ou adapter `.env`)

## Installation

```bash
pnpm install
```

## Démarrage

```bash
# API
pnpm --filter backend dev

# Worker d'import
pnpm --filter backend worker

# Worker de sync des épisodes
pnpm --filter backend sync
```

## Tests

```bash
pnpm --filter backend test
```

## Lint / Typecheck

```bash
pnpm --filter backend lint
pnpm --filter backend typecheck
```
