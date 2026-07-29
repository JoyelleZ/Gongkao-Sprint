# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains planning documents for the `Gongkao Sprint` Obsidian plugin:

- `memory-bank/design-document.md`: product behavior, user flows, and MVP phases.
- `memory-bank/tech-stack.md`: chosen implementation stack and tradeoffs.
- `memory-bank/implementation-plan.md`: step-by-step implementation plan for AI developers.
- `memory-bank/frontend-design.md`: frontend layout, interaction, and visual design guidance.
- `memory-bank/architecture.md`: architecture notes to update as implementation evolves.
- `memory-bank/progress.md`: progress log to update after meaningful milestones.
- `spec.md`: data models, commands, vault layout, and acceptance criteria.

When implementation begins, follow the planned structure:

```text
src/
  main.ts
  settings.ts
  views/
  modals/
  services/
  components/
  utils/
tests/
styles.css
manifest.json
versions.json
```

User data created by the plugin should live under `Gongkao/` inside the Obsidian vault.

## Build, Test, and Development Commands

The codebase is not initialized yet. Once the Obsidian plugin scaffold is added, use these expected commands:

- `npm install`: install development dependencies.
- `npm run dev`: build the plugin in watch/development mode with esbuild.
- `npm run build`: type-check and create production `main.js`.
- `npm test`: run Vitest tests.
- `npm run lint`: run ESLint over `src/`.

Keep scripts aligned with `memory-bank/tech-stack.md`.

## Coding Style & Naming Conventions

Use TypeScript with strict mode. Prefer Obsidian native APIs and DOM components over React/Vue/Svelte for the first version. Use 2-space indentation, semicolons, and clear PascalCase class names such as `DashboardView` or `ReviewScheduler`.

Use `camelCase` for variables/functions, `PascalCase` for classes/types, and `UPPER_SNAKE_CASE` for constants. Prefix CSS classes with `gongkao-`, for example `.gongkao-dashboard`.

## Testing Guidelines

Use Vitest for unit tests. Prioritize tests for date utilities, filename sanitization, review scheduling, frontmatter conversion, and statistics.

Place tests under `tests/` or next to source files as `*.test.ts`. Run `npm test` before submitting changes.

## Commit & Pull Request Guidelines

There is no Git history yet, so use conventional, descriptive commits:

- `docs: add contributor guide`
- `feat: add review scheduler`
- `fix: handle missing next_review`

Pull requests should include a short summary, affected files/modules, test results, and screenshots or screen recordings for UI changes. Link related issues or design sections when relevant.

## Architecture Notes

Core data must remain in Markdown files and YAML frontmatter. Do not add SQLite, IndexedDB, remote databases, OCR, or AI services for the MVP. Keep the plugin usable without external community-plugin dependencies.

## 重要提示

写代码前先阅读 `memory-bank/design-document.md`、`memory-bank/tech-stack.md` 和 `memory-bank/implementation-plan.md`；涉及界面、样式、交互或用户流程时再阅读 `memory-bank/frontend-design.md`。

每完成一个重大功能或里程碑后，更新 `memory-bank/progress.md`；发生重要架构变化后，更新 `memory-bank/architecture.md`。
