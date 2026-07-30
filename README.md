# Gongkao Sprint

Gongkao Sprint is an Obsidian plugin for civil service exam study workflows. The
MVP focuses on practice collections, error cards, reflection logs, daily plans,
spaced review, and an effort heatmap.

Development is guided by the documents in `memory-bank/`.

## MVP Features

- Dashboard for daily plan, due reviews, practice collections, weekly practice, reflections, weakness reminders, and effort heatmap.
- Practice collections for 行测 topics, papers, and books.
- Error cards with text or image input, optional collection binding, review scheduling, and rectangle masks for covering answers or handwritten explanations.
- Structured reflection logs for techniques, thinking habits, mistakes, time strategy, and correction actions.
- Review session with front/back card flow and mastery feedback.
- Daily plan generation using due cards, active/default collections, and recent correction signals.
- Example data creation for trying the full workflow in a clean vault.

## Data Storage

All study data is stored as Markdown in the vault. By default, files are created under:

- `Gongkao/Collections/`
- `Gongkao/PracticeLogs/`
- `Gongkao/ErrorCards/`
- `Gongkao/Reflections/`
- `Gongkao/Plans/`
- `Gongkao/Attachments/`

No AI service, OCR service, database, or network API is required for the MVP.

## Commands

- `Open Gongkao Dashboard`
- `Initialize Gongkao Data Directories`
- `Create Error Card`
- `Create Reflection Log`
- `Start Error Card Review`
- `Generate Daily Plan`
- `Create Example Data`

## Release Files

For an Obsidian plugin install, the required files are:

- `manifest.json`
- `main.js`
- `styles.css`

## Development

- `npm install`: install dependencies.
- `npm run dev`: build in watch mode.
- `npm run build`: type-check and build production output.
- `npm test`: run unit tests.
- `npm run lint`: run lint checks.
