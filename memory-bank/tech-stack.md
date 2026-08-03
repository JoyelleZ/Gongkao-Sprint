# Gongkao Sprint Tech Stack

## 1. 技术栈目标

`Gongkao Sprint` 第一版是一款桌面优先、手机轻量可用的 Obsidian Community Plugin。技术选型需要服务以下目标：

- 开箱即用，安装后不依赖额外插件。
- 数据完全保存在 Markdown 文件和 YAML frontmatter 中。
- 不调用 AI 服务，不需要网络权限。
- 工作台使用主区域自定义 View，尽量提供接近全屏 App 的体验。
- 支持本地图片、拖拽图片、剪贴板粘贴图片和矩形遮挡。
- 保持首版实现轻量，避免为了未来扩展引入过重框架。

## 2. 参考项目

### 2.1 Obsidian Sample Plugin

参考点：

- 官方插件目录结构。
- TypeScript + esbuild 构建方式。
- `manifest.json`、`main.ts`、`styles.css`、`versions.json` 的发布结构。
- Obsidian API 的基础用法。

适用结论：

- 首版从官方 sample plugin 结构起步。
- 使用 esbuild，而不是 Vite/Webpack。

### 2.2 Obsidian Tasks

参考点：

- 以 Markdown 为事实来源。
- 从整个 vault 中解析结构化任务。
- 在插件视图或查询结果中更新原始 Markdown 文件。
- 用户卸载插件后，任务内容仍然可读。

适用结论：

- Gongkao Sprint 的刷题记录、错题卡和每日计划也应保持 Markdown 可读。
- 插件 UI 只是 Markdown 数据的操作层，不做封闭数据库。

### 2.3 Obsidian Day Planner

参考点：

- 从每日笔记或任务中读取计划。
- 使用清晰 UI 展示日程、时间块和当天进度。
- 将“日常推进”做成比普通 Markdown 更顺手的界面。

适用结论：

- Gongkao Sprint 的工作台应强调“今天要做什么”。
- 每日计划可以保存在 Markdown 中，但用自定义 View 提供更强操作体验。

### 2.4 Obsidian Spaced Repetition / Spaced Repetition AI

参考点：

- 闪卡复习流程。
- 到期队列。
- 正面/背面卡片体验。
- 复习反馈驱动下次排期。

适用结论：

- 第一版只借鉴复习交互，不直接实现完整 FSRS。
- 保持“不依赖 AI”的产品边界。
- 复习状态写回错题卡 frontmatter。

### 2.5 QuickAdd / Dataview / Tracker

参考点：

- QuickAdd：快速录入和模板化捕获。
- Dataview：frontmatter 数据查询和聚合思路。
- Tracker：从 Markdown 数据中做进度统计和可视化。

适用结论：

- 首版不依赖这些插件，但借鉴其产品模式。
- 快速录入、数据聚合、进度统计都由 Gongkao Sprint 内部实现。

## 3. 核心技术选型

### 3.1 语言

使用 TypeScript。

原因：

- Obsidian 插件生态主流选择。
- 便于定义错题卡、刷题集合、复习记录等数据模型。
- 降低 frontmatter 字段读写时的类型错误。

### 3.2 构建工具

使用 esbuild。

原因：

- 官方 sample plugin 默认路线。
- 构建速度快。
- 配置简单，适合首版插件。

不使用：

- Webpack：配置偏重。
- Vite：适合 Web App，但 Obsidian 插件首版不需要完整 dev server 体验。

### 3.3 UI 实现

首版建议使用 Obsidian 原生 DOM API + 小型组件分层，不引入 React/Vue/Svelte。

原因：

- 插件界面复杂度中等，原生 DOM 足够。
- 降低 bundle 体积。
- 减少 Community Plugin 审核和长期维护成本。
- 避免轻量插件变成前端应用工程。

推荐结构：

```text
views/
  DashboardView.ts
  ReviewView.ts
components/
  PracticeCollectionCard.ts
  TodayPlanPanel.ts
  ReviewQueuePanel.ts
  ModuleWeaknessPanel.ts
  EffortHeatmap.ts
  ImageMaskEditor.ts
modals/
  PracticeCollectionModal.ts
  PracticeLogModal.ts
  ErrorCardModal.ts
```

后续如果 UI 复杂度显著上升，可再评估 Svelte。Svelte 在 Obsidian 社区中有实践案例，但第一版没有必要。

### 3.4 样式

使用 `styles.css`，遵循 Obsidian CSS 变量。

建议：

- 使用 `var(--background-primary)`、`var(--text-normal)`、`var(--interactive-accent)` 等 Obsidian 主题变量。
- 不硬编码大面积品牌色。
- 支持浅色和深色主题。
- 组件 class 使用统一前缀 `gongkao-`，避免污染用户主题。

示例：

```css
.gongkao-dashboard {
  background: var(--background-primary);
  color: var(--text-normal);
}
```

### 3.5 数据存储

使用 Obsidian Vault 中的 Markdown 文件 + YAML frontmatter。

核心目录：

```text
Gongkao Sprint/
  01_今日计划/
  02_刷题记录/
  03_错题库/
  04_复习队列/
  05_专题训练/
  06_复盘记录/
  07_学习模板/
  08_资源库/
  Dashboard.md
```

不使用：

- SQLite
- IndexedDB
- 独立 JSON 数据库
- 远程数据库

原因：

- 用户卸载插件后数据仍可读。
- 符合 Obsidian 用户对本地 Markdown 的期待。
- Community Plugin 首版更容易获得信任。

### 3.6 Frontmatter 处理

优先使用 Obsidian API 读写 frontmatter：

- `app.metadataCache.getFileCache(file)`
- `app.fileManager.processFrontMatter(file, callback)`

原则：

- 读取时优先使用 metadata cache。
- 更新时使用 Obsidian 提供的 frontmatter 处理能力，减少手写 YAML 解析风险。
- 文件正文固定模板，尽量避免依赖复杂正文解析。

必要时可引入轻量 YAML 工具，但首版应优先使用 Obsidian API。

### 3.7 日期处理

首版使用原生 `Date` + 自定义日期工具函数。

推荐内部日期格式：

- 日期：`YYYY-MM-DD`
- 时间戳：ISO 字符串

暂不引入：

- moment
- dayjs
- date-fns

原因：

- 首版日期逻辑简单。
- 减少依赖。
- Obsidian 本身历史上暴露 moment，但新插件不应强依赖。

## 4. 图片与遮挡技术方案

### 4.1 图片输入

支持：

- 文件选择：`input[type="file"]`
- 拖拽：监听 `dragover`、`drop`
- 剪贴板：监听 `paste` 事件中的 `clipboardData.items`

图片复制到：

```text
Gongkao Sprint/08_资源库/Attachments/
```

通过 Obsidian Vault API 写入附件文件。

### 4.2 图片格式

首版支持常见格式：

- jpg
- jpeg
- png
- webp

保存前提供右转 90°、放大弹窗裁剪、对比度滑杆即时预览并松手确认、黑白处理。编辑后的图片统一转为 png 文件保存。

原因：

- Obsidian 可以直接显示常见图片。
- 首版重点是“能拍照、能整理清楚、能遮挡、能复习”。

### 4.3 遮挡编辑器

使用 HTML 原生布局实现：

```text
wrapper div
  image element
  absolutely positioned mask rectangles
```

不使用 Canvas 作为主渲染方式。

原因：

- DOM 矩形更容易移动、缩放、删除。
- 更容易适配 Obsidian 主题和普通事件处理。
- 坐标转换更直观。

遮挡坐标保存为原图自然尺寸下的像素：

```ts
interface ImageMask {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}
```

渲染时：

```ts
displayX = mask.x * displayedWidth / naturalWidth;
displayY = mask.y * displayedHeight / naturalHeight;
displayWidth = mask.width * displayedWidth / naturalWidth;
displayHeight = mask.height * displayedHeight / naturalHeight;
```

### 4.4 正面与背面渲染

复习正面：

- 显示图片。
- 覆盖 `masks` 矩形。
- 不显示背面 Markdown 内容。

复习背面：

- 显示完整图片。
- 显示答案、核心突破口、我的错因、下次提醒。
- 用户可从错题或刷题记录创建结构化复盘记录，沉淀技巧和思维惯性。

## 5. 复习排期技术方案

首版不实现完整 FSRS，也不引入 FSRS 库。

原因：

- 产品要求“像 Anki/FSRS 一样根据掌握度动态排期但不用太复杂”。
- 题量规模和首版功能不需要完整算法。
- 避免让用户理解复杂参数。

使用内部轻量调度器：

```ts
type ReviewResult = "again" | "hard" | "good" | "easy";

function scheduleNextReview(card: ErrorCard, result: ReviewResult, today: Date): ReviewUpdate;
```

调度规则：

- `again`：1 天后。
- `hard`：3 天后。
- `good`：`min(14, 7 + reviewCount)` 天后。
- `easy`：`min(45, 21 + reviewCount * 3)` 天后。

后续如果需要，可以把 `ReviewScheduler` 替换为 FSRS 实现，但外部接口保持稳定。

## 6. 状态管理

首版不引入 Redux、Zustand、RxJS 等状态库。

使用简单服务层 + View 内局部状态：

```text
DashboardView
  loadData()
  render()
  refresh()

Services
  query Markdown/frontmatter
  update files
```

刷新策略：

- 打开工作台时全量扫描 `Gongkao Sprint` 目录。
- 执行创建、更新、复习操作后主动刷新当前 View。
- 后续可监听 Vault 事件做增量刷新。

## 7. 测试方案

### 7.1 单元测试

建议使用 Vitest。

优先测试：

- 日期工具函数。
- 文件名清理。
- 复习排期规则。
- frontmatter 数据模型转换。
- 统计计算。
- 热力图每日努力值计算。

### 7.2 集成测试

首版可以先做轻量集成测试：

- 使用临时目录模拟 Vault 数据。
- 测试服务层能创建刷题集合、刷题记录、错题卡。
- 测试服务层能创建复盘记录，并按模块、类型和关联对象查询。
- 测试复习后 frontmatter 更新正确。

### 7.3 UI 测试

首版不强制 Playwright 自动化。

建议人工验收：

- 工作台主区域打开。
- 新增刷题集合。
- 记录刷题。
- 新增图片错题。
- 查看努力热力图。
- 创建遮罩。
- 复习并更新排期。

## 8. 代码质量

建议工具：

- ESLint
- TypeScript strict mode
- Prettier

推荐 npm scripts：

```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "vitest run",
    "lint": "eslint src --ext .ts"
  }
}
```

## 9. 发布方案

Community Plugin 发布包包含：

- `main.js`
- `manifest.json`
- `styles.css`

版本规则：

- `manifest.json` 中的 `version` 与 Git tag 保持一致。
- 更新 `versions.json`。
- Release asset 上传上述文件。

首版 `manifest.json`：

```json
{
  "id": "gongkao-sprint",
  "name": "Gongkao Sprint",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "A civil service exam study dashboard for question collections, error cards, and spaced review.",
  "author": "",
  "isDesktopOnly": false
}
```

## 10. 暂不采用的技术

### React / Vue / Svelte

首版暂不采用。原因是 UI 复杂度还没到必须引入框架的程度，原生 Obsidian API + DOM 组件足够。

### SQLite / IndexedDB

首版暂不采用。核心数据必须保存在 Markdown 中。

### OCR / AI SDK

首版暂不采用。产品明确不做 AI 解析和 OCR。

### Canvas 主渲染

首版暂不采用 Canvas 作为图片遮挡主方案。DOM 遮罩更易维护。

### Dataview / Tasks 作为依赖

首版不依赖外部社区插件。可以借鉴它们的 Markdown 数据理念，但 Gongkao Sprint 应能独立运行。

## 11. 风险与应对

### 11.1 Markdown 扫描性能

风险：用户错题卡数量多时，工作台扫描变慢。

应对：

- MVP 先全量扫描 `Gongkao Sprint` 目录，而不是全 vault。
- 后续引入内存缓存和 Vault 事件增量更新。

### 11.2 图片体积过大

风险：用户拍照图片较大，Vault 体积增长明显。

应对：

- 首版先不压缩。
- 在 UI 中提示用户可使用截图或压缩图。
- 后续增加可选压缩。

### 11.3 遮挡坐标错位

风险：图片缩放后遮罩位置偏移。

应对：

- 坐标保存为原图自然尺寸。
- 渲染时统一按比例换算。
- 图片加载完成后再绘制遮罩。

### 11.4 用户误改 Markdown

风险：用户手动编辑 frontmatter 导致插件读取失败。

应对：

- 读取时做字段校验和默认值兜底。
- 遇到无效卡片时在工作台显示“需要修复”的提示。
- 不静默覆盖用户正文。

## 12. 推荐首版依赖

生产依赖：

```text
obsidian
```

开发依赖：

```text
typescript
esbuild
eslint
prettier
vitest
@types/node
```

首版尽量不增加运行时第三方依赖。
