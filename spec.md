# Gongkao Sprint Technical Spec

## 1. 技术目标

本插件是一个桌面优先的 Obsidian Community Plugin，使用 TypeScript 开发。若本文档与 `memory-bank/design-document.md` 存在冲突，以 `memory-bank/design-document.md` 为准。

核心目标：

- 使用主区域自定义 View 提供行测备考工作台。
- 用户界面统一使用“刷题集合”，代码概念使用 `PracticeCollection`。
- 支持专题、套卷、书籍三类刷题集合。
- 不要求用户输入总题数，进度由刷题记录自然累积。
- 支持一题一 Markdown 文件的错题卡。
- 支持独立复盘记录，用于沉淀技巧、思维惯性、触发场景和纠偏动作。
- 支持备考努力热力图，用于展示备考周期内的每日投入，并为后续分享内容预留基础。
- 支持纯文本错题和带图片错题。
- 支持图片附件、拖拽、剪贴板粘贴和多个矩形遮罩。
- 所有核心数据保存在 Markdown 文件和 YAML frontmatter 中。
- 第一版不使用 AI、OCR、数据库或外部社区插件依赖。

## 2. Community Plugin 约束

发布文件：

- `main.js`
- `manifest.json`
- `styles.css`

基础项目文件：

- `main.ts`
- `styles.css`
- `manifest.json`
- `versions.json`
- `README.md`
- `LICENSE`

建议 `manifest.json`：

```json
{
  "id": "gongkao-sprint",
  "name": "Gongkao Sprint",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "A civil service exam study dashboard for practice collections, error cards, and spaced review.",
  "author": "",
  "isDesktopOnly": true
}
```

## 3. 源码目录

建议结构：

```text
src/
  main.ts
  settings.ts
  constants.ts
  types.ts
  views/
    DashboardView.ts
    ReviewView.ts
  modals/
    PracticeCollectionModal.ts
    PracticeLogModal.ts
    ErrorCardModal.ts
    ReflectionLogModal.ts
    ImageMaskModal.ts
  services/
    VaultStore.ts
    PracticeCollectionService.ts
    PracticeLogService.ts
    ErrorCardService.ts
    ReflectionLogService.ts
    ReviewScheduler.ts
    StatsService.ts
  components/
    PracticeCollectionCard.ts
    ReviewQueue.ts
    ModuleStats.ts
    EffortHeatmap.ts
    ImageMaskEditor.ts
  utils/
    date.ts
    frontmatter.ts
    fileName.ts
```

## 4. Vault 数据目录

默认根目录为 `Gongkao Sprint`，可在设置中修改。Gongkao Sprint 不是独立 App，而是基于 Obsidian 文件系统的备考管理增强层。

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

Dashboard 只读取 Vault 中的 Markdown 数据并提供分析、跳转和快速创建操作。插件界面不得重复模拟“今日计划、复习队列、错题库、专题库、模板库、资源库”等 Obsidian 文件树导航，也不得把 `01_今日计划`、`04_复习队列`、`05_专题训练` 等 Vault 文件夹名显示为卡片右上角分类标签。

## 5. 数据模型

### 5.1 行测模块

固定模块：

- 言语理解
- 判断推理
- 资料分析
- 数量关系
- 常识判断

### 5.2 刷题集合

每个刷题集合是一篇 Markdown 文件，存放于 `Gongkao Sprint/05_专题训练/`。

frontmatter：

```yaml
type: gongkao-practice-collection
collection_id: pc_20260729_001
name: 资料分析增长率专项
collection_type: topic
subject: 行测
module: 资料分析
status: active
current_round: 1
created: 2026-07-29
updated: 2026-07-29
```

`collection_type`：

- `topic`：专题
- `paper`：套卷
- `book`：书籍

`status`：

- `not_started`
- `active`
- `first_round_done`
- `second_round`
- `paused`

统计字段如累计刷题数、累计错题数、最近刷题日期不作为事实来源，默认由刷题记录计算。

### 5.3 刷题记录

刷题记录存放于 `Gongkao Sprint/02_刷题记录/`，MVP 采用一条记录一文件。

frontmatter：

```yaml
type: gongkao-practice-log
date: 2026-07-29
collection_id: pc_20260729_001
collection_name: 资料分析增长率专项
collection_type: topic
module: 资料分析
total: 40
wrong: 8
duration_minutes: 60
round: 1
source: 粉笔行测5000题
range_label: 第 41-80 题
created: 2026-07-29T20:00:00+08:00
```

`range_label` 是自由文本，只用于用户定位来源，不参与统计。

### 5.4 错题卡

每道错题是一篇 Markdown 文件，存放于 `Gongkao Sprint/03_错题库/`。图片可选，纯文本错题也必须可保存和复习。

frontmatter：

```yaml
type: gongkao-error-card
subject: 行测
module: 资料分析
question_type: 增长率
collection_id: pc_20260729_001
collection_name: 资料分析增长率专项
collection_type: topic
source: 粉笔行测5000题
range_label: 第 47 题
round: 1
answer: B
wrong_reason: 公式混淆
mastery: 1
review_count: 0
created: 2026-07-29
last_reviewed:
next_review: 2026-08-01
status: active
image: Attachments/2026-07-29-资料分析-001.jpg
masks:
  - x: 620
    y: 180
    width: 260
    height: 140
    label: 手写解析
review_history: []
```

无图片错题可省略 `image` 和 `masks`。

正文固定结构：

```markdown
# 资料分析错题 - 增长率

## 正面

问题：这题考什么？

## 背面

正确答案：B

核心突破口：

我的错因：

下次提醒自己：
```

### 5.5 初始复习日期

新建错题卡时，`next_review` 根据初始掌握度生成：

- 不会：明天
- 模糊：3 天后
- 基本会：7 天后
- 熟练：21 天后

### 5.6 复盘记录

复盘记录存放于 `Gongkao Sprint/06_复盘记录/`，用于记录技巧、思维惯性、触发场景和纠偏动作。复盘可以关联当天、一次刷题记录、一个错题卡、一个刷题集合或一个行测模块。

frontmatter：

```yaml
type: gongkao-reflection-log
reflection_id: rf_20260729_001
date: 2026-07-29
scope: error_card
module: 资料分析
collection_id: pc_20260729_001
collection_name: 资料分析增长率专项
error_card_path: 03_错题库/2026-07-29-资料分析-001.md
reflection_type: 思维惯性
created: 2026-07-29T21:00:00+08:00
updated: 2026-07-29T21:00:00+08:00
```

`scope`：

- `daily`
- `practice_log`
- `error_card`
- `collection`
- `module`

`reflection_type`：

- 技巧沉淀
- 思维惯性
- 易错提醒
- 时间策略
- 方法步骤
- 其他

正文固定结构：

```markdown
# 资料分析复盘 - 思维惯性

## 触发场景

## 我的问题

## 技巧/方法

## 下次纠偏动作
```

### 5.7 每日计划

每日计划存放于 `Gongkao Sprint/01_今日计划/YYYY-MM-DD.md`，工作台读取该文件并展示。

frontmatter：

```yaml
type: gongkao-daily-plan
date: 2026-07-29
created: 2026-07-29T09:00:00+08:00
```

正文使用 Markdown task checkbox，完成率由勾选状态计算。

## 6. 图片遮挡

图片来源：

- 本地选择
- 拖拽
- 剪贴板粘贴

图片复制到 `Gongkao Sprint/08_资源库/Attachments/`。首版支持 `jpg`、`jpeg`、`png`、`webp`，不做 OCR、AI 识别、自动裁剪、压缩或旋转矫正。

遮挡只支持多个矩形。坐标以原图自然尺寸为基准保存，渲染时按显示尺寸等比例换算。

## 7. 复习排期

反馈按钮：

- 不会
- 模糊
- 基本会
- 熟练

内部结果：

- `again`
- `hard`
- `good`
- `easy`

排期规则：

- `again`：掌握度降到 0，1 天后复习。
- `hard`：掌握度最多为 1，3 天后复习。
- `good`：掌握度至少为 2，`7 + review_count` 天后复习，最多 14 天。
- `easy`：掌握度为 3，`21 + review_count * 3` 天后复习，最多 45 天。

每次复习更新：

- `mastery`
- `review_count`
- `last_reviewed`
- `next_review`
- `review_history`

## 8. 工作台统计

工作台汇总：

- 今日计划与倒计时。
- 今日复习。
- 当前主刷题集合。
- 本周刷题概览。
- 最近复盘记录。
- 薄弱与纠偏提醒。
- 备考努力热力图。

薄弱与纠偏规则：

- 最近 7 天错题数最多的模块。
- 到期复习错题数最多的模块。
- 同一模块存在 3 张以上 `mastery <= 1` 的错题。
- 同一模块最近 7 天存在 2 条以上“思维惯性”复盘。

热力图数据来源：

- 当日刷题记录数量和刷题总量。
- 当日复习记录数量。
- 当日复盘记录数量。
- 当日计划完成率。

热力图 MVP 只在工作台展示，不提供导出图片。后续可基于该数据增加小红书分享图。

## 9. 命令与设置

命令：

- `Open Gongkao Dashboard`
- `Create Practice Collection`
- `Log Practice Session`
- `Create Error Card`
- `Create Reflection Log`
- `Start Review`
- `Generate Daily Plan`
- `Create Example Data`

设置项：

- 数据根目录，默认 `Gongkao Sprint`。
- 附件目录，默认 `Gongkao Sprint/08_资源库/Attachments`。
- 默认主刷题集合。
- 是否启用图片遮挡，默认开启。
- 是否显示示例数据入口，默认开启。
- 考试日期，可选。

## 10. 文件命名规则

```text
05_专题训练/{safeCollectionName}.md
02_刷题记录/{date}-{safeCollectionName}-{module}.md
03_错题库/{date}-{module}-{sequence}.md
06_复盘记录/{date}-{module}-{sequence}.md
08_资源库/Attachments/{date}-{module}-{sequence}.{ext}
01_今日计划/{date}.md
```

文件名需要清理 `/ \ : * ? " < > |` 等不适合跨平台文件系统的字符。中文名称应尽量保留可读性。

## 11. 验收标准

- 可以创建专题、套卷、书籍三类刷题集合。
- 用户无需输入总题数，也能通过刷题记录看到累计推进。
- 刷题集合使用稳定 `collection_id` 关联刷题记录和错题卡。
- 用户可以手动标记首刷完成，完成后 UI 标灰。
- 可以创建纯文本错题和带图片错题。
- 可以创建复盘记录，并关联错题、刷题集合、行测模块或当天整体复盘。
- 可以为图片错题添加多个矩形遮罩。
- 复习正面显示遮罩图或纯文本正面，背面显示完整内容。
- 新建错题按初始掌握度生成 `next_review`。
- 复习后按掌握度更新排期和历史。
- 今日计划生成 `Gongkao Sprint/01_今日计划/YYYY-MM-DD.md`，工作台读取并展示。
- Dashboard 不提供第二套左侧导航；用户通过 Obsidian 原生文件树进入 `01_今日计划`、`03_错题库`、`06_复盘记录` 等真实文件夹。
- Dashboard Banner 使用插件内部 `assets/apple-banner.svg`，通过插件资源路径加载。
- 工作台展示最近复盘，并在薄弱与纠偏提醒中纳入“思维惯性”复盘。
- 工作台展示备考努力热力图，能反映最近一段备考周期的每日投入。
- 所有核心数据均保存在 Markdown 和 frontmatter 中。
- 插件不需要网络权限，不调用 AI，不做 OCR，不使用数据库。
