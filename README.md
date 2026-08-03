# Gongkao Sprint

Gongkao Sprint is an Obsidian Vault-native study layer for civil service exam
preparation. It does not create a second app-style navigation inside Obsidian;
Markdown files and folders remain the source of truth, while the dashboard reads
those files to provide planning, review, analysis, and quick creation actions.

Development is guided by the documents in `memory-bank/`.

## MVP Features

- Desktop dashboard for daily plan, due reviews, topic practice, weekly practice, reflections, weakness reminders, and effort heatmap.
- Lightweight mobile dashboard for photo error-card capture, practice logging, and review.
- Practice collections for 行测 topics, papers, and books.
- Error cards with text or image input, optional collection binding, review scheduling, and rectangle masks for covering answers or handwritten explanations. Mobile supports camera/photo-library image selection.
- Structured reflection logs for techniques, thinking habits, mistakes, time strategy, and correction actions.
- Review session with front/back card flow and mastery feedback.
- Daily plan generation using due cards, active/default topics, and recent correction signals.
- Vault-native quick actions that create Markdown files in the corresponding folders.
- Example data creation for trying the full workflow in a clean vault.

## Data Storage

All study data is stored as Markdown in the vault. By default, files are created under:

- `Gongkao Sprint/01_今日计划/`
- `Gongkao Sprint/02_刷题记录/`
- `Gongkao Sprint/03_错题库/`
- `Gongkao Sprint/04_复习队列/`
- `Gongkao Sprint/05_专题训练/`
- `Gongkao Sprint/06_复盘记录/`
- `Gongkao Sprint/07_学习模板/`
- `Gongkao Sprint/08_资源库/`
- `Gongkao Sprint/Dashboard.md`

`04_复习队列` is a visible workflow folder. The actual due-review queue is
computed from frontmatter in `03_错题库`, so one wrong question has one Markdown
source file.

Folder names are storage and File Explorer structure only. Dashboard cards must
not display vault folder names as right-side category labels.

No AI service, OCR service, database, or network API is required for the MVP.

## Commands

- `Open Gongkao Dashboard`
- `Initialize Gongkao Data Directories`
- `Create Error Card`
- `Create Reflection Log`
- `Create Practice Log`
- `Create Practice Collection`
- `Manage Exam Countdowns`
- `Start Error Card Review`
- `Generate Daily Plan`
- `Create Example Data`

## Release Files

For an Obsidian plugin install, the required files are:

- `manifest.json`
- `main.js`
- `styles.css`
- `assets/frontcover.png`
- `assets/mobilecover.png`

## Development

- `npm install`: install dependencies.
- `npm run dev`: build in watch mode.
- `npm run build`: type-check and build production output.
- `npm test`: run unit tests.
- `npm run lint`: run lint checks.
