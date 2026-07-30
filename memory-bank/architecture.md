# Architecture

## Current State

The repository now contains a minimal Obsidian Community Plugin scaffold for `Gongkao Sprint`.

## Source Layout

- `src/main.ts`: plugin lifecycle, dashboard command, ribbon entry, settings registration, and data directory initialization command.
- `src/settings.ts`: persisted plugin settings and settings tab UI.
- `src/views/DashboardView.ts`: main workspace dashboard View aligned to the frontend design. It renders the top action area, today plan placeholder, real review summary, real collection summaries, real weekly practice summaries, recent reflections, weakness reminder, empty state, and real effort heatmap.
- `src/modals/ErrorCardModal.ts`: native Obsidian modal for text-first error-card creation. It keeps input choices constrained for the target user and defers image-specific workflows to Phase 9.
- `src/modals/ReflectionLogModal.ts`: native Obsidian modal for structured reflection logs. It uses fixed scope/type options and required correction fields to prevent the feature from becoming a free-form diary.
- `src/services/DashboardService.ts`: dashboard model builder that combines practice collections, practice logs, error cards, and reflection logs into collection summaries, current-week totals, recent logs, module wrong-rate summaries, review summaries, recent reflections, effort heatmap data, and empty-state detection.
- `src/services/EffortService.ts`: effort heatmap service that creates a continuous recent-day series, scores daily effort from practice, review history, reflections, and planned future plan completion, then maps scores to 0-4 visual levels.
- `src/services/ErrorCardService.ts`: error-card service for `Gongkao/ErrorCards/`, using stable `error_card_id`, fixed frontmatter, initial review scheduling, optional collection binding, and due-card queries.
- `src/services/ReflectionLogService.ts`: reflection-log service for `Gongkao/Reflections/`, using stable `reflection_id`, fixed frontmatter, structured Markdown body sections, and query support.
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

`ErrorCard` files are stored under `Gongkao/ErrorCards/`. Cards can be independent or bound to a practice collection through `collection_id`; the readable collection name is retained for Markdown usability. Initial review dates are generated from mastery 0-3 using the lightweight spaced-review schedule in `src/utils/date.ts`.

`ReflectionLog` files are stored under `Gongkao/Reflections/`. Logs can represent daily, module, collection, practice-log, or error-card scopes. The required fields are trigger, problem, method, and next correction action, preserving the product focus on exam-specific复盘 rather than open-ended journaling.

Effort heatmap data is computed at render time rather than stored separately. The current score inputs are practice totals, error-card review history, and reflection counts. Plan completion contribution is reserved in `EffortService` and should be connected when `DailyPlan` support lands in Phase 11.

The main plugin entry owns lifecycle registration and delegates vault file operations to `VaultStore`. Feature services should depend on `VaultStore` rather than calling Obsidian Vault APIs directly, keeping future dashboard and modal code focused on workflow behavior.

`DashboardView` receives `DashboardService` and action callbacks from `src/main.ts` through constructor injection. Keep dashboard statistics in `DashboardService` or pure helpers so layout changes do not duplicate aggregation logic. Current non-error-card and non-reflection action buttons intentionally show placeholder notices until the corresponding modal workflows are implemented.
