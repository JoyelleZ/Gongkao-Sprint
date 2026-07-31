import { ItemView, Notice, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_GONGKAO_DASHBOARD } from "../constants";
import type { GongkaoSprintSettings } from "../settings";
import type { DashboardCollectionSummary, DashboardModel, DashboardService } from "../services/DashboardService";
import { buildHeatmapLayout } from "../services/EffortService";
import { daysBetween, todayString } from "../utils/date";

interface DashboardActions {
  createErrorCard: () => void;
  createReflectionLog: () => void;
  createPracticeLog: () => void;
  startReview: () => void;
  generateDailyPlan: () => void;
  createExampleData: () => void;
  openFile: (file?: TFile) => void;
}

type MetricTone = "neutral" | "green" | "warn" | "danger";

export class DashboardView extends ItemView {
  private heatmapResizeObserver: ResizeObserver | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly dashboardService: DashboardService,
    private readonly getSettings: () => GongkaoSprintSettings,
    private readonly coverImageSrc: string,
    private readonly actions: DashboardActions,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_GONGKAO_DASHBOARD;
  }

  getDisplayText(): string {
    return "Gongkao Sprint 工作台";
  }

  getIcon(): string {
    return "sprout";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  async render(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("gongkao-dashboard");
    const model = await this.dashboardService.loadModel();

    const shell = container.createDiv({ cls: "gongkao-dashboard__shell" });
    const main = shell.createDiv({ cls: "gongkao-dashboard__main" });
    this.renderTopbar(main);
    this.renderActions(main);
    this.renderHero(main);

    const grid = main.createDiv({ cls: "gongkao-dashboard__grid" });
    this.renderPlanPanel(grid, model);
    this.renderReviewPanel(grid, model);
    this.renderCollectionPanel(grid, model.collections);
    this.renderWeekPanel(grid, model);
    this.renderReflectionPanel(grid, model);
    const timeRow = grid.createDiv({ cls: "gongkao-dashboard__time-row" });
    this.renderWeaknessPanel(timeRow, model);
    this.renderTimePanel(timeRow, model);
  }

  private renderTopbar(parent: HTMLElement): void {
    const topbar = parent.createDiv({ cls: "gongkao-topbar" });
    const greeting = topbar.createDiv({ cls: "gongkao-topbar__greeting" });
    greeting.createDiv({ cls: "weather-icon", text: "☼" });
    greeting.createEl("h1", { text: this.getGreetingLine() });

    const date = topbar.createDiv({ cls: "gongkao-topbar__date" });
    date.createSpan({ text: this.getTodayLine() });
  }

  private renderActions(parent: HTMLElement): void {
    const actions = parent.createDiv({ cls: "gongkao-actions" });
    this.renderActionButton(actions, "新增错题", "x", () => this.actions.createErrorCard());
    this.renderActionButton(actions, "新建复盘", "calendar-check", () => this.actions.createReflectionLog());
    this.renderActionButton(actions, "记录刷题", "file-pen-line", () => this.actions.createPracticeLog());
    this.renderActionButton(actions, "创建今日计划", "calendar-plus", () => this.actions.generateDailyPlan());
    this.renderActionButton(actions, "开始复习", "play", () => this.actions.startReview(), true);
  }

  private renderActionButton(
    parent: HTMLElement,
    label: string,
    icon: string,
    onClick: () => void,
    primary = false,
  ): void {
    const button = parent.createEl("button", {
      cls: primary ? "gongkao-button gongkao-button--primary" : "gongkao-button",
      attr: { "aria-label": label },
    });
    const iconEl = button.createSpan({ cls: "gongkao-button__icon" });
    setIcon(iconEl, icon);
    button.createSpan({ text: label });
    button.addEventListener("click", onClick);
  }

  private renderHero(parent: HTMLElement): void {
    const banner = parent.createDiv({ cls: "gongkao-banner" });
    const image = banner.createEl("img", {
      cls: "banner-image",
      attr: {
        src: this.coverImageSrc,
        alt: "Gongkao Sprint Banner",
      },
    });
    const fallback = banner.createDiv({ cls: "gongkao-banner__fallback", text: "Gongkao Sprint" });
    image.addEventListener("error", () => {
      image.addClass("banner-image--hidden");
      fallback.addClass("gongkao-banner__fallback--visible");
      banner.addClass("gongkao-banner--fallback");
      console.warn("Gongkao Sprint banner image failed to load:", this.coverImageSrc);
    });
  }

  private renderPanelTitle(parent: HTMLElement, title: string, icon: string, meta?: string): void {
    const header = parent.createDiv({ cls: "gongkao-panel__header" });
    const titleEl = header.createEl("h2");
    const iconEl = titleEl.createSpan({ cls: "gongkao-panel__icon" });
    setIcon(iconEl, icon);
    titleEl.createSpan({ text: title });
    if (meta) {
      header.createEl("span", { text: meta, cls: "gongkao-panel__meta" });
    }
  }

  private renderMetric(parent: HTMLElement, value: string, label: string, tone: MetricTone): void {
    const metric = parent.createDiv({ cls: `gongkao-metric gongkao-metric--${tone}` });
    metric.createEl("strong", { text: value });
    metric.createEl("span", { text: label });
  }

  private renderPlanPanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--plan" });
    this.renderPanelTitle(panel, "今日任务概览", "sprout");

    if (!model.plan.exists || model.plan.tasks.length === 0) {
      this.renderEmptyBlock(
        panel,
        "暂无学习计划",
        "创建今日计划后，这里会显示你的刷题、复习和纠偏任务。",
        "创建今日计划",
        "calendar-plus",
        () => this.actions.generateDailyPlan(),
      );
      return;
    }

    const countdownLine = this.getExamCountdownLine();
    const countdownNumber = countdownLine.match(/\d+/)?.[0] ?? "--";
    const countdown = panel.createDiv({ cls: "gongkao-countdown" });
    countdown.createEl("span", { text: countdownLine.includes("天") ? "距离考试还有" : "考试倒计时" });
    countdown.createEl("strong", { text: countdownNumber });
    countdown.createEl("small", { text: countdownLine.includes("天") ? "天" : countdownLine });

    const completedCount = model.plan.tasks.filter((task) => task.startsWith("已完成")).length;
    const taskTotal = model.plan.tasks.length;
    panel.createEl("p", {
      text: taskTotal > 0 ? `今日任务 ${completedCount}/${taskTotal}` : "今日任务：暂无计划",
      cls: "gongkao-section-label",
    });

    const tasks = panel.createDiv({ cls: "gongkao-task-list" });
    const visibleTasks = model.plan.tasks.slice(0, 5);
    if (visibleTasks.length === 0) {
      tasks.createEl("p", { text: "生成今日计划后，这里会显示刷题、复习和纠偏任务。", cls: "gongkao-empty-text" });
    } else {
      for (const task of visibleTasks) {
        const done = task.startsWith("已完成");
        const row = tasks.createDiv({ cls: done ? "gongkao-task gongkao-task--done" : "gongkao-task" });
        const check = row.createSpan({ cls: "gongkao-task__check" });
        setIcon(check, done ? "check-circle-2" : "circle");
        row.createSpan({ text: task.replace(/^已完成：|^待完成：/, "") });
        row.createEl("small", { text: done ? "已完成" : "待完成" });
        row.addEventListener("click", () => this.actions.openFile(model.plan.file));
      }
    }

    this.renderProgress(panel, model.plan.completionRate);
  }

  private renderReviewPanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--review" });
    this.renderPanelTitle(panel, "复习提醒", "calendar-clock");

    if (model.review.dueCount === 0 && model.review.recentNewCount === 0 && Object.keys(model.review.byModule).length === 0) {
      this.renderEmptyBlock(
        panel,
        "0 张待复习题",
        "完成刷题后，错题会自动进入复习队列。",
        "开始复习",
        "play",
        () => this.actions.startReview(),
      );
      return;
    }

    const due = panel.createDiv({ cls: "gongkao-due" });
    const dueCopy = due.createDiv();
    dueCopy.createEl("span", { text: "到期错题" });
    dueCopy.createEl("strong", { text: String(model.review.dueCount) });
    dueCopy.createEl("small", { text: "张" });
    const overdue = due.createEl("button", {
      text: model.review.overdueCount > 0 ? `逾期 ${model.review.overdueCount} 张` : "无逾期",
      cls: "gongkao-link-button",
    });
    overdue.addEventListener("click", () => this.actions.startReview());

    const dueList = panel.createDiv({ cls: "gongkao-mini-file-list" });
    for (const entry of model.review.dueCards.slice(0, 3)) {
      const button = dueList.createEl("button", { cls: "gongkao-mini-file" });
      button.createSpan({ text: `${entry.card.module} · ${entry.card.question_type ?? entry.card.wrong_reason ?? "错题"}` });
      button.createEl("small", { text: entry.file?.basename ?? entry.card.next_review });
      button.addEventListener("click", () => this.actions.openFile(entry.file));
    }

    panel.createEl("p", { text: "模块分布", cls: "gongkao-section-label" });
    const moduleGrid = panel.createDiv({ cls: "gongkao-module-grid" });
    const modules = Object.entries(model.review.byModule).slice(0, 4);
    const fallbackModules: Array<[string, number]> = [
      ["资料分析", 0],
      ["判断推理", 0],
      ["言语理解", 0],
      ["数量关系", 0],
    ];
    for (const [module, count] of modules.length > 0 ? modules : fallbackModules) {
      const item = moduleGrid.createDiv({ cls: "gongkao-module" });
      const icon = item.createSpan();
      setIcon(icon, this.getModuleIcon(module));
      item.createEl("span", { text: module });
      item.createEl("strong", { text: String(count) });
    }

    this.renderActionButton(panel.createDiv({ cls: "gongkao-panel__actions" }), "开始复习", "play", () => this.actions.startReview(), true);
    const recentButton = panel.createEl("button", { cls: "gongkao-subtle-button" });
    recentButton.createSpan({ text: `+ 最近新增错题 ${model.review.recentNewCount} 张` });
    recentButton.addEventListener("click", () => this.actions.createErrorCard());
  }

  private renderCollectionPanel(parent: HTMLElement, collections: DashboardCollectionSummary[]): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--collections" });
    this.renderPanelTitle(panel, "专题进度", "folder-check");

    if (collections.length === 0) {
      this.renderEmptyBlock(
        panel,
        "暂无刷题集合",
        "创建一个专题、套卷或题库，开始记录你的学习进度。",
        "新建专题",
        "folder-plus",
        () => new Notice("新建专题功能将在后续步骤接入。"),
      );
      return;
    }

    const list = panel.createDiv({ cls: "gongkao-collection-list" });
    for (const summary of collections.slice(0, 3)) {
      const done = summary.collection.status === "first_round_done";
      const item = list.createDiv({ cls: done ? "gongkao-collection gongkao-collection--done" : "gongkao-collection" });
      const top = item.createDiv({ cls: "gongkao-collection__top" });
      top.createEl("strong", { text: summary.collection.name });
      top.createEl("span", { text: this.formatCollectionType(summary.collection.collection_type), cls: "gongkao-tag" });
      item.createEl("p", {
        text: `第 ${summary.collection.current_round} 轮｜累计刷题 ${summary.total}｜错题 ${summary.wrong}`,
      });
      const bottom = item.createDiv({ cls: "gongkao-collection__bottom" });
      bottom.createSpan({ text: `最近刷题：${summary.lastPracticeDate ?? "暂无记录"}` });
      bottom.createSpan({ text: done ? "首刷完成 ✓" : "刷题中", cls: done ? "gongkao-success" : "gongkao-muted" });
      item.addEventListener("click", () => this.actions.openFile(summary.file));
    }
  }

  private renderWeekPanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--week" });
    this.renderPanelTitle(panel, "本周刷题概览", "line-chart");
    const metrics = panel.createDiv({ cls: "gongkao-metrics gongkao-metrics--split" });
    this.renderMetric(metrics, String(model.week.total), "刷题总量", "green");
    this.renderMetric(metrics, String(model.week.wrong), "错题总量", "warn");

    const list = panel.createDiv({ cls: "gongkao-activity-list" });
    const recent = model.week.recentLogs.slice(0, 3);
    if (recent.length === 0) {
      this.renderEmptyBlock(panel, "暂无刷题记录", "开始练习后，这里会生成学习统计。");
      return;
    }

    for (const entry of recent) {
      const log = entry.log;
      const row = list.createDiv({ cls: "gongkao-activity" });
      row.createEl("span", { text: `${log.date} ${log.module}` });
      row.createEl("strong", { text: `+${log.total}` });
      row.addEventListener("click", () => this.actions.openFile(entry.file));
    }
  }

  private renderReflectionPanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--reflection" });
    this.renderPanelTitle(panel, "最近复盘", "notebook-pen");
    const list = panel.createDiv({ cls: "gongkao-reflection-list" });

    if (model.reflections.recent.length === 0) {
      this.renderEmptyBlock(panel, "暂无复盘记录", "记录你的错误原因、解题思路和改进方向。");
      return;
    }

    for (const source of model.reflections.recent.slice(0, 3)) {
      const entry = source.reflection;
      const row = list.createDiv({ cls: "gongkao-reflection" });
      row.createEl("span", { text: entry.reflection_type, cls: "gongkao-tag gongkao-tag--soft" });
      row.createEl("strong", { text: entry.problem ?? entry.trigger ?? "复盘记录" });
      row.createEl("small", { text: `${entry.module ?? "综合"}｜下次纠偏：${entry.next_action ?? "待补充"}` });
      row.createEl("span", { text: entry.date, cls: "gongkao-reflection__date" });
      row.addEventListener("click", () => this.actions.openFile(source.file));
    }
  }

  private renderWeaknessPanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--weakness" });
    this.renderPanelTitle(panel, "薄弱与纠偏提醒", "radar");
    if (model.weakness.lines.every((line) => line === "暂无足够数据" || line.includes("完成几次刷题"))) {
      this.renderEmptyBlock(panel, "暂无能力分析", "持续刷题后，系统会分析你的薄弱模块。");
      return;
    }

    const list = panel.createDiv({ cls: "gongkao-weakness-list" });
    for (const line of model.weakness.lines.slice(0, 3)) {
      const item = list.createDiv({ cls: "gongkao-weakness" });
      const icon = item.createSpan();
      setIcon(icon, "pie-chart");
      item.createEl("strong", { text: line.split("：")[0] ?? "提醒" });
      item.createEl("span", { text: line.includes("：") ? line.split("：").slice(1).join("：") : line });
    }
  }

  private renderTimePanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--time gongkao-time-panel" });
    this.renderPanelTitle(panel, "学习日历与备考热力图", "calendar-days", "近90天备考热力图");

    const body = panel.createDiv({ cls: "gongkao-time-panel__body" });
    const calendar = body.createDiv({ cls: "gongkao-time-panel__calendar" });
    const heatmap = body.createDiv({ cls: "gongkao-time-panel__heatmap" });

    this.renderCalendar(calendar, model);
    this.renderHeatmap(heatmap, model);

    requestAnimationFrame(() => {
      console.info("Gongkao time layout:", {
        parentClass: parent.className,
        weaknessClass: "gongkao-panel gongkao-panel--weakness",
        timePanelClass: panel.className,
        timePanelComputedWidth: `${Math.round(panel.getBoundingClientRect().width)} px`,
      });
    });
  }

  private renderHeatmap(parent: HTMLElement, model: DashboardModel): void {
    const heatmap = parent.createDiv({ cls: "gongkao-heatmap-panel" });

    const days = model.heatmap;
    const layout = buildHeatmapLayout(days);
    const hasEffort = days.some((day) => day.effortScore > 0);
    if (!hasEffort) {
      heatmap.createEl("p", {
        text: "暂无学习记录。完成学习后，这里会生成你的 90 天备考热力图。",
        cls: "gongkao-heatmap-empty-text",
      });
    }

    const graph = heatmap.createDiv({ cls: "gongkao-heatmap-wrap" });
    graph.style.gridTemplateColumns = `24px repeat(${layout.totalColumns}, var(--heatmap-cell-size))`;
    for (const month of layout.months) {
      const label = graph.createSpan({ cls: "gongkao-heatmap-month", text: month.label });
      label.style.gridColumnStart = String(month.column + 1);
      label.style.gridRowStart = "1";
    }

    for (const [index, day] of ["一", "二", "三", "四", "五", "六", "日"].entries()) {
      const weekday = graph.createSpan({ cls: "gongkao-heatmap-weekday", text: day });
      weekday.style.gridColumnStart = "1";
      weekday.style.gridRowStart = String(index + 2);
    }

    for (const cellModel of layout.cells) {
      const day = cellModel.day;
      const cell = graph.createDiv({
        cls: `heatmap-cell gongkao-heatmap__cell gongkao-heatmap__cell--${day.level}`,
        attr: {
          "data-date": day.date,
          "data-count": String(day.count),
          "aria-label": day.tooltip,
        },
      });
      cell.style.gridRowStart = String(cellModel.row + 1);
      cell.style.gridColumnStart = String(cellModel.column + 1);
      cell.addEventListener("click", () => {
        new Notice(`${day.date}：热力来自刷题与复盘 Markdown 数据。`);
      });
    }

    const legend = heatmap.createDiv({ cls: "gongkao-heatmap-legend" });
    legend.createEl("span", { text: "少" });
    for (let level = 0; level <= 4; level += 1) {
      legend.createDiv({ cls: `gongkao-heatmap__cell gongkao-heatmap__cell--${level}` });
    }
    legend.createEl("span", { text: "多" });
    legend.createEl("span", { text: "数据来自 Vault Markdown", cls: "gongkao-heatmap-detail" });

    this.setupHeatmapResizeObserver(graph, layout.totalColumns);

    console.info("Heatmap days:", days.length);
    console.info("Cells:", graph.querySelectorAll(".heatmap-cell").length);
    console.info("Calendar:", "enabled");
    console.info("Months:");
    for (const month of layout.months) console.info(month.label);
  }

  /** Dynamically set --heatmap-cell-size so the grid fits the panel without scrolling. */
  private setupHeatmapResizeObserver(graph: HTMLElement, totalColumns: number): void {
    if (this.heatmapResizeObserver) {
      this.heatmapResizeObserver.disconnect();
    }

    const GAP = 4; // matches CSS gap on .gongkao-heatmap-wrap
    const MAX_CELL = 20;
    const MIN_CELL = 10;
    let lastCellSize = 0;

    const updateSize = () => {
      const w = graph.clientWidth;
      if (w === 0) return;

      const WEEKDAY_COLUMN = 24;
      let size = Math.floor((w - WEEKDAY_COLUMN - totalColumns * GAP) / totalColumns);
      size = Math.max(MIN_CELL, Math.min(MAX_CELL, size));

      if (size !== lastCellSize) {
        lastCellSize = size;
        graph.style.setProperty("--heatmap-cell-size", `${size}px`);
      }
    };

    updateSize();
    this.heatmapResizeObserver = new ResizeObserver(() => updateSize());
    this.heatmapResizeObserver.observe(graph);
  }

  private renderCalendar(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-calendar-panel" });
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-based
    const todayDate = today.getDate();

    // Header
    const header = panel.createDiv({ cls: "gongkao-mini-calendar__header" });
    header.createEl("strong", { text: `${year}.${String(month + 1).padStart(2, "0")}` });

    // Weekday labels
    const weekRow = panel.createDiv({ cls: "gongkao-mini-calendar__week" });
    for (const day of ["一", "二", "三", "四", "五", "六", "日"]) {
      weekRow.createSpan({ text: day });
    }

    // Day grid
    const grid = panel.createDiv({ cls: "gongkao-mini-calendar__grid" });

    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1; // days from Mon
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Leading empty cells
    for (let i = 0; i < mondayOffset; i++) {
      grid.createDiv({ cls: "gongkao-mini-calendar__day gongkao-mini-calendar__day--muted" });
    }

    // Day cells
    const hasPlanToday = model.plan.exists && model.plan.tasks.length > 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayCell = grid.createDiv({ cls: "gongkao-mini-calendar__day" });
      if (d === todayDate) {
        dayCell.addClass("gongkao-mini-calendar__day--today");
      }
      dayCell.createSpan({ text: String(d) });

      // Plan indicator for today
      if (d === todayDate && hasPlanToday) {
        dayCell.setAttr("title", `今日 ${model.plan.tasks.length} 项任务`);
        dayCell.style.position = "relative";
        const dot = dayCell.createDiv();
        dot.style.cssText =
          "position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--gongkao-green,#6d925a);";
      }
    }
  }

  private renderEmptyBlock(
    parent: HTMLElement,
    title: string,
    description: string,
    actionLabel?: string,
    actionIcon?: string,
    onAction?: () => void,
  ): void {
    const empty = parent.createDiv({ cls: "gongkao-card-empty" });
    const icon = empty.createSpan({ cls: "gongkao-card-empty__icon" });
    setIcon(icon, "sparkles");
    empty.createEl("strong", { text: title });
    empty.createEl("p", { text: description });

    if (actionLabel && actionIcon && onAction) {
      this.renderActionButton(empty.createDiv({ cls: "gongkao-card-empty__actions" }), actionLabel, actionIcon, onAction);
    }
  }

  private renderProgress(parent: HTMLElement, value: number): void {
    const progress = parent.createDiv({ cls: "gongkao-progress" });
    progress.createDiv({
      cls: "gongkao-progress__bar",
      attr: { style: `width: ${Math.min(Math.max(value, 0), 100)}%` },
    });
    const label = parent.createDiv({ cls: "gongkao-progress__label" });
    label.createSpan({ text: "完成率" });
    label.createEl("strong", { text: `${value}%` });
  }

  private getExamCountdownLine(): string {
    const examDate = this.getSettings().examDate;
    if (!examDate) {
      return "距考试：未设置";
    }

    const days = daysBetween(todayString(), examDate);
    return days >= 0 ? `距考试：${days} 天` : "考试日期已过去";
  }

  private getGreetingLine(): string {
    const hour = new Date().getHours();
    if (hour < 6) {
      return "晚上好，继续加油！";
    }
    if (hour < 12) {
      return "早上好，继续加油！";
    }
    if (hour < 18) {
      return "下午好，继续加油呀！";
    }
    return "晚上好，继续加油！";
  }

  private getTodayLine(): string {
    const today = new Date();
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, "0");
    const day = `${today.getDate()}`.padStart(2, "0");
    return `今天是 ${year}-${month}-${day} ${weekdays[today.getDay()]}`;
  }

  private getModuleIcon(module: string): string {
    const icons: Record<string, string> = {
      资料分析: "pie-chart",
      判断推理: "puzzle",
      言语理解: "message-square-text",
      数量关系: "blocks",
      常识判断: "landmark",
    };
    return icons[module] ?? "circle-dot";
  }

  private formatCollectionType(type: DashboardCollectionSummary["collection"]["collection_type"]): string {
    const labels = {
      topic: "专题",
      paper: "套卷",
      book: "题集",
    };

    return labels[type];
  }
}
