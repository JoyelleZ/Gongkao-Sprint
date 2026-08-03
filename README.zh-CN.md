# Gongkao Sprint

Gongkao Sprint 是一款面向公务员考试备考的 Obsidian 插件。当前版本聚焦行测备考，把今日计划、刷题记录、错题卡片、复习排期、复盘记录、专题进度和备考热力图整合到一个工作台中。

插件不依赖 AI、OCR、数据库或网络服务。所有学习数据都保存在 Obsidian Vault 的 Markdown 文件里，用户可以继续用自己习惯的方式阅读、编辑、整理和备份。

## 适合谁

- 正在准备国考、省考等公务员考试，首版主要使用行测功能的用户。
- 希望开箱即用，不想配置复杂知识库系统的用户。
- 希望错题、复盘、计划和进度都留在 Markdown 文件中的 Obsidian 用户。
- 想用类似 Anki/FSRS 的轻量复习节奏，但不需要复杂参数的用户。

## 当前功能

- 桌面工作台：集中展示今日任务、复习提醒、专题进度、本周刷题、最近复盘、薄弱提醒和备考热力图。
- 手机轻量入口：在 Obsidian Mobile 中优先提供拍照新增错题、记录刷题和开始复习。
- 今日计划：根据到期错题、主刷题集合和近期复盘信号生成当天计划。
- 多考试倒计时：支持记录多个目标日期，例如国考、省考，并在工作台展示最近的未过期考试。
- 刷题集合：支持专题、套卷、题集三类集合，用于贴近“一本本题集/一组专题”推进的刷题习惯。
- 刷题记录：记录日期、集合、模块、刷题数、错题数、用时、轮次和范围说明。
- 错题卡片：支持文字错题和图片错题，可绑定刷题集合；手机端可拍照或从相册选择图片。
- 图片遮挡：可对题目图片中的答案、解析或手写笔记区域添加矩形遮罩，复习时先看题面再翻背面。
- 错题复习：使用正反面卡片流程，并根据掌握度反馈更新下次复习日期。
- 复盘记录：结构化记录技巧、思维惯性、易错提醒、时间策略和下一步纠偏动作。
- 示例数据：可在干净 Vault 中创建一套示例数据，快速体验完整流程。

## 数据保存位置

默认会在 Vault 中创建以下目录：

- `Gongkao Sprint/01_今日计划/`
- `Gongkao Sprint/02_刷题记录/`
- `Gongkao Sprint/03_错题库/`
- `Gongkao Sprint/04_复习队列/`
- `Gongkao Sprint/05_专题训练/`
- `Gongkao Sprint/06_复盘记录/`
- `Gongkao Sprint/07_学习模板/`
- `Gongkao Sprint/08_资源库/`
- `Gongkao Sprint/Dashboard.md`

复习队列由 `03_错题库` 中的 frontmatter 动态计算，不会为同一错题额外创建第二份来源文件。考试倒计时保存在 `Dashboard.md` 的 frontmatter 中。

## 使用方式

1. 在 Obsidian 中启用插件。
2. 使用左侧 Ribbon 图标或命令面板打开 `Gongkao Sprint 工作台`。
3. 首次使用时可先执行 `Initialize Gongkao Data Directories` 初始化数据目录。
4. 桌面端从工作台顶部按顺序使用：`制定今日计划`、`记录刷题`、`新增错题`、`新建复盘`、`开始复习`。
5. 手机端打开工作台后，优先使用：`拍照新增错题`、`记录刷题`、`开始复习`。
6. 如果还没有真实数据，可以执行 `Create Example Data` 体验完整流程。

## 命令

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

## 手动安装文件

Obsidian 插件安装需要以下文件：

- `manifest.json`
- `main.js`
- `styles.css`
- `assets/frontcover.png`
- `assets/mobilecover.png`

将这些文件放入 Vault 的 `.obsidian/plugins/gongkao-sprint/` 目录后，在 Obsidian 设置中启用插件。

## 开发命令

- `npm install`：安装依赖。
- `npm run dev`：开发模式构建并监听变化。
- `npm run build`：类型检查并构建生产版本。
- `npm test`：运行单元测试。
- `npm run lint`：运行 ESLint 检查。

## 当前限制

- 桌面端提供完整工作台；手机端当前是轻量入口，不展示完整大屏统计工作台。
- 首版仅聚焦行测，不包含申论。
- 暂不内置 AI 解析、OCR 识别或云端同步。
- 手机端图片错题支持拍照或相册选择；遮挡编辑建议先在桌面端完成。
