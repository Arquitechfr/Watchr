# Fix Upcoming Tab Error

## Root Cause

`getUpcomingEpisodes` in `apps/backend/src/services/upcoming.service.ts` crashes (500) for certain shows, especially on new accounts. The function is missing critical safety measures that `getUnwatched` (which works correctly) has:

1. **Missing `.lean()`** — Without `.lean()`, Mongoose hydrates full documents with Maps and nested subdocuments, causing potential crashes with edge-case data (especially `translations` Map and `nextEpisodeToAir` subdocument)
2. **No type filtering** — Processes movies alongside TV shows unnecessarily
3. **No null-safe access** — `show._id.toString()`, `show.tmdbId` accessed directly without fallbacks
4. **No season pre-filtering** — Iterates all seasons including those with no episodes

## Fix

File: `apps/backend/src/services/upcoming.service.ts`

1. Add `.lean()` to the `WatchEntry.find().populate()` query
2. Add null-safe access patterns matching `getUnwatched`:
   - `show._id?.toString() ?? entry.showId.toString()`
   - `show.tmdbId ?? 0`
   - `show.posterPath ?? null`
3. Skip non-TV shows early (`if (show.type !== "tv") continue`)
4. Filter seasons with episodes before iterating (like `getUnwatched`)
5. Add defensive `airDate` validity check before `.toISOString()`

## Verification

- Run existing test: `npx vitest run apps/backend/tests/tracking.test.ts`
- All 12 tests should still pass, including the "translation with empty episodes" test
