# Progress

## 2026-07-29

- Completed Phase 1 project initialization.
- Added Obsidian plugin scaffold with `manifest.json`, `versions.json`, `styles.css`, TypeScript config, esbuild config, ESLint, Prettier, Vitest, README, and LICENSE.
- Added minimal source structure under `src/`, including constants, core types, settings tab, dashboard view, and utility functions.
- Added initial unit tests for date scheduling and file name sanitization.
- Verified `npm run build`, `npm test`, and `npm run lint` all pass.
- Note: `npm install` required network permission. NPM reported 5 high severity audit findings; no forced audit fix was applied.
- Added `.gitignore` for local dependencies, OS files, logs, coverage, and build directories.
- Completed the core of Phase 2 by routing data directory initialization through `VaultStore`.
- Completed the first pass of Phase 3 data access:
  - Added stable ID generation in `src/utils/id.ts`.
  - Added validation helpers in `src/utils/validation.ts`.
  - Added `src/services/VaultStore.ts` for vault path management, directory creation, Markdown/frontmatter writing, frontmatter reading/updating, and attachment copying.
- Completed the first pass of Phase 4 practice collection and practice log services:
  - Added `src/services/PracticeCollectionService.ts` for creating, listing, updating, finding by `collection_id`, and marking first round done.
  - Added `src/services/PracticeLogService.ts` for creating logs, listing logs, validating practice totals, and aggregating stats by `collection_id` and module.
- Added tests for stable IDs, practice collection creation metadata, practice log aggregation, and invalid practice log input.
- Re-verified `npm run build`, `npm test`, and `npm run lint` all pass with 13 tests across 5 test files.
- Started Phase 5 dashboard data integration:
  - Added `src/services/DashboardService.ts` to build a dashboard model from practice collections and practice logs.
  - Dashboard now reads real collection/log data, shows collection totals, wrong counts, latest practice date, current round, first-round completed muted styling, weekly totals, recent 3 practice logs, and the highest wrong-rate module reminder.
  - Added empty-state guidance for a new Vault. Buttons currently show placeholder notices until creation/review/reflection modals are implemented in later phases.
  - Fixed week-start calculation to avoid timezone drift in Asia/Shanghai.
- Added dashboard model tests for stable `collection_id` aggregation and Monday-to-today weekly summaries.
- Re-verified `npm run build`, `npm test`, and `npm run lint` all pass with 15 tests across 6 test files.
