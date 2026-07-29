# Architecture

## Current State

The repository now contains a minimal Obsidian Community Plugin scaffold for `Gongkao Sprint`.

## Source Layout

- `src/main.ts`: plugin lifecycle, dashboard command, ribbon entry, settings registration, and data directory initialization command.
- `src/settings.ts`: persisted plugin settings and settings tab UI.
- `src/views/DashboardView.ts`: main workspace dashboard View aligned to the frontend design. It renders the top action area, today plan placeholder, review placeholder, real collection summaries, real weekly practice summaries, reflection placeholder, weakness reminder, empty state, and heatmap placeholder.
- `src/services/DashboardService.ts`: dashboard model builder that combines practice collections and practice logs into collection summaries, current-week totals, recent logs, module wrong-rate summaries, and empty-state detection.
- `src/services/VaultStore.ts`: shared Obsidian Vault access layer for path normalization, required folder creation, Markdown file creation, frontmatter read/update, unique path generation, and attachment copying.
- `src/services/PracticeCollectionService.ts`: practice collection service for `Gongkao/Collections/`, using stable `collection_id` values and Markdown-readable collection files.
- `src/services/PracticeLogService.ts`: practice log service for `Gongkao/PracticeLogs/`, using `collection_id` for stable historical attribution and providing aggregation helpers.
- `src/constants.ts`: plugin IDs, default vault paths, 行测 modules, and review result constants.
- `src/types.ts`: core TypeScript models for practice collections, practice logs, error cards, reflection logs, daily plans, masks, and effort days.
- `src/utils/date.ts`: date formatting and review scheduling helpers.
- `src/utils/fileName.ts`: safe filename helpers.
- `src/utils/id.ts`: stable ID helper for entities such as `PracticeCollection` and `ReflectionLog`.
- `src/utils/validation.ts`: shared validation helpers for 行测 modules and numeric user input.

## Build And Test

- Build uses esbuild and TypeScript.
- Tests use Vitest.
- Lint uses ESLint flat config with TypeScript ESLint.

## Data Model Direction

Core data remains Markdown-first. The default vault root is `Gongkao/`, with planned subdirectories for `Plans`, `Collections`, `ErrorCards`, `Reflections`, `PracticeLogs`, and `Attachments`.

`PracticeCollection` files are stored under `Gongkao/Collections/` and must preserve their `collection_id` across display-name edits. `PracticeLog` files are stored under `Gongkao/PracticeLogs/`; logs keep both `collection_id` and readable collection names so old records remain attributable after a collection is renamed.

The main plugin entry owns lifecycle registration and delegates vault file operations to `VaultStore`. Feature services should depend on `VaultStore` rather than calling Obsidian Vault APIs directly, keeping future dashboard and modal code focused on workflow behavior.

`DashboardView` receives `DashboardService` from `src/main.ts` through constructor injection. Keep dashboard statistics in `DashboardService` or pure helpers so layout changes do not duplicate aggregation logic. Current action buttons intentionally show placeholder notices until the corresponding modal workflows are implemented.
