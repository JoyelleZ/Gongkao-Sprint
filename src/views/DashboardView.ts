import { ItemView, Notice, setIcon, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_GONGKAO_DASHBOARD } from "../constants";
import type { GongkaoSprintSettings } from "../settings";
import type { DashboardCollectionSummary, DashboardModel, DashboardService } from "../services/DashboardService";
import { daysBetween, todayString } from "../utils/date";

interface DashboardActions {
  createErrorCard: () => void;
  createReflectionLog: () => void;
  startReview: () => void;
  generateDailyPlan: () => void;
  createExampleData: () => void;
}

type MetricTone = "neutral" | "green" | "warn" | "danger";

export class DashboardView extends ItemView {
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
    this.renderSidebar(shell);

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
    this.renderWeaknessPanel(grid, model);
    this.renderHeatmap(grid, model);

  }

  private renderSidebar(parent: HTMLElement): void {
    const sidebar = parent.createDiv({ cls: "gongkao-sidebar" });
    const brand = sidebar.createDiv({ cls: "gongkao-sidebar__brand" });
    const brandText = brand.createDiv({ cls: "gongkao-sidebar__brand-text" });
    brandText.createEl("strong", { text: "GONGKAO" });
    brandText.createEl("span", { text: "Sprint" });
    const chevron = brand.createSpan();
    setIcon(chevron, "chevron-down");

    const nav = sidebar.createDiv({ cls: "gongkao-sidebar__nav" });
    const navItems: Array<[string, string, boolean]> = [
      ["工作台", "home", true],
      ["今日计划", "calendar-check", false],
      ["复习队列", "refresh-cw", false],
      ["刷题集合", "folder-check", false],
      ["错题库", "book-open-check", false],
      ["复盘记录", "notebook-pen", false],
      ["专题库", "archive", false],
      ["模板库", "file-check-2", false],
      ["资源库", "route", false],
    ];

    for (const [label, icon, active] of navItems) {
      const item = nav.createEl("button", {
        cls: active ? "gongkao-sidebar__item gongkao-sidebar__item--active" : "gongkao-sidebar__item",
        attr: { "aria-label": label },
      });
      const iconEl = item.createSpan();
      setIcon(iconEl, icon);
      item.createSpan({ text: label });
      if (!active) {
        item.addEventListener("click", () => new Notice(`${label} 视图将在后续步骤接入。`));
      }
    }

    this.renderMiniCalendar(sidebar);

    const encouragement = sidebar.createDiv({ cls: "gongkao-sidebar-card" });
    const cup = encouragement.createSpan({ cls: "gongkao-sidebar-card__icon" });
    setIcon(cup, "cup-soda");
    encouragement.createEl("p", { text: "坚持的每一步都会让你更接近上岸！" });

    const footer = sidebar.createDiv({ cls: "gongkao-sidebar__footer" });
    footer.createEl("span", { text: "Gongkao Sprint v0.1.0" });
    const help = footer.createSpan();
    setIcon(help, "circle-help");
    const settings = footer.createSpan();
    setIcon(settings, "settings");
  }

  private renderMiniCalendar(parent: HTMLElement): void {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();

    const calendar = parent.createDiv({ cls: "gongkao-mini-calendar" });
    const header = calendar.createDiv({ cls: "gongkao-mini-calendar__header" });
    header.createEl("strong", { text: `${year}.${`${month + 1}`.padStart(2, "0")}` });
    const controls = header.createDiv();
    const prev = controls.createSpan();
    setIcon(prev, "chevron-left");
    const next = controls.createSpan();
    setIcon(next, "chevron-right");

    const weekRow = calendar.createDiv({ cls: "gongkao-mini-calendar__week" });
    for (const day of ["一", "二", "三", "四", "五", "六", "日"]) {
      weekRow.createSpan({ text: day });
    }

    const grid = calendar.createDiv({ cls: "gongkao-mini-calendar__grid" });
    const normalizedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let index = 0; index < 42; index += 1) {
      const dayNumber = index - normalizedFirstDay + 1;
      const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const shownDay = isCurrentMonth
        ? dayNumber
        : dayNumber < 1
          ? previousDays + dayNumber
          : dayNumber - daysInMonth;
      const cls = [
        "gongkao-mini-calendar__day",
        isCurrentMonth ? "" : "gongkao-mini-calendar__day--muted",
        isCurrentMonth && shownDay === today.getDate() ? "gongkao-mini-calendar__day--today" : "",
      ]
        .filter(Boolean)
        .join(" ");
      grid.createSpan({ text: String(shownDay), cls });
    }
  }

  private renderTopbar(parent: HTMLElement): void {
    const topbar = parent.createDiv({ cls: "gongkao-topbar" });
    const greeting = topbar.createDiv({ cls: "gongkao-topbar__greeting" });
    const icon = greeting.createSpan();
    setIcon(icon, "cloud-sun");
    greeting.createEl("h1", { text: this.getGreetingLine() });
    greeting.createSpan({ cls: "gongkao-topbar__sun" });

    const date = topbar.createDiv({ cls: "gongkao-topbar__date" });
    const dateIcon = date.createSpan();
    setIcon(dateIcon, "calendar-days");
    date.createSpan({ text: this.getTodayLine() });
  }

  private renderActions(parent: HTMLElement): void {
    const actions = parent.createDiv({ cls: "gongkao-actions" });
    this.renderActionButton(actions, "新增错题", "x", () => this.actions.createErrorCard());
    this.renderActionButton(actions, "新增复盘", "calendar-check", () => this.actions.createReflectionLog());
    this.renderActionButton(actions, "记录刷题", "file-pen-line", () => new Notice("记录刷题功能将在后续步骤接入。"));
    this.renderActionButton(actions, "新建专题/套卷", "clipboard-check", () => new Notice("新建专题/套卷功能将在后续步骤接入。"));
    this.renderActionButton(actions, "生成今日计划", "calendar-plus", () => this.actions.generateDailyPlan());
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
    const hero = parent.createDiv({ cls: "gongkao-hero" });
    hero.createEl("img", {
      cls: "gongkao-hero__cover",
      attr: {
        src: this.coverImageSrc,
        alt: "专注当下，稳步冲刺",
      },
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
    } else {
      const more = header.createSpan({ cls: "gongkao-panel__more" });
      setIcon(more, "ellipsis");
    }
  }

  private renderMetric(parent: HTMLElement, value: string, label: string, tone: MetricTone): void {
    const metric = parent.createDiv({ cls: `gongkao-metric gongkao-metric--${tone}` });
    metric.createEl("strong", { text: value });
    metric.createEl("span", { text: label });
  }

  private renderPlanPanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--plan" });
    this.renderPanelTitle(panel, "今日计划", "sprout");

    if (!model.plan.exists || model.plan.tasks.length === 0) {
      this.renderEmptyBlock(
        panel,
        "暂无学习计划",
        "创建今日计划后，这里会显示你的刷题、复习和纠偏任务。",
        "生成今日计划",
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
      }
    }

    this.renderProgress(panel, model.plan.completionRate);
  }

  private renderReviewPanel(parent: HTMLElement, model: DashboardModel): void {
    const panel = parent.createDiv({ cls: "gongkao-panel gongkao-panel--review" });
    this.renderPanelTitle(panel, "今日复习", "calendar-clock");

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
    this.renderPanelTitle(panel, "当前刷题集合", "folder-check", "全部集合 >");

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

    for (const log of recent) {
      const row = list.createDiv({ cls: "gongkao-activity" });
      row.createEl("span", { text: `${log.date} ${log.module}` });
      row.createEl("strong", { text: `+${log.total}` });
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

    for (const entry of model.reflections.recent.slice(0, 3)) {
      const item = list.createDiv({ cls: "gongkao-reflection" });
      item.createEl("span", { text: entry.reflection_type, cls: "gongkao-tag gongkao-tag--soft" });
      item.createEl("strong", { text: entry.problem ?? entry.trigger ?? "复盘记录" });
      item.createEl("small", { text: `${entry.module ?? "综合"}｜下次纠偏：${entry.next_action ?? "待补充"}` });
      item.createEl("span", { text: entry.date, cls: "gongkao-reflection__date" });
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

  private renderHeatmap(parent: HTMLElement, model: DashboardModel): void {
    const heatmap = parent.createDiv({ cls: "gongkao-panel gongkao-panel--heatmap" });
    this.renderPanelTitle(heatmap, "备考努力热力图", "flame", "近 90 天");

    const hasEffort = model.heatmap.some((day) => day.effortScore > 0);
    if (!hasEffort) {
      heatmap.createEl("p", {
        text: "暂无学习记录。完成学习后，这里会生成你的 90 天备考热力图。",
        cls: "gongkao-heatmap-empty-text",
      });
    }

    const graph = heatmap.createDiv({ cls: "gongkao-heatmap-wrap" });
    const weekdays = graph.createDiv({ cls: "gongkao-heatmap-weekdays" });
    for (const day of ["一", "二", "三", "四", "五", "六", "日"]) {
      weekdays.createSpan({ text: day });
    }

    const content = graph.createDiv({ cls: "gongkao-heatmap-content" });
    const months = content.createDiv({ cls: "gongkao-heatmap-months" });
    for (const month of this.getHeatmapMonths(model)) {
      months.createSpan({ text: month });
    }

    const cells = content.createDiv({ cls: "gongkao-heatmap" });
    for (const day of model.heatmap) {
      const cell = cells.createDiv({
        cls: `gongkao-heatmap__cell gongkao-heatmap__cell--${day.level}`,
        attr: {
          title: day.tooltip,
          "aria-label": day.tooltip,
        },
      });
      cell.addEventListener("click", () => {
        new Notice(`${day.date}：当天记录列表将在后续计划/记录视图中打开。`);
      });
    }

    const legend = heatmap.createDiv({ cls: "gongkao-heatmap-legend" });
    legend.createEl("span", { text: "少" });
    for (let level = 0; level <= 4; level += 1) {
      legend.createDiv({ cls: `gongkao-heatmap__cell gongkao-heatmap__cell--${level}` });
    }
    legend.createEl("span", { text: "多" });
    const detail = legend.createEl("button", { text: "查看详情", cls: "gongkao-heatmap-detail" });
    detail.addEventListener("click", () => new Notice("备考努力详情将在后续记录视图中打开。"));
  }

  private renderEmptyState(parent: HTMLElement): void {
    const empty = parent.createDiv({ cls: "gongkao-empty-state" });
    empty.createEl("h2", { text: "从第一个刷题集合开始" });
    empty.createEl("p", { text: "全新 Vault 不会自动生成示例数据。你可以先创建集合，再记录一次刷题。" });
    const actions = empty.createDiv({ cls: "gongkao-empty-actions" });

    const buttons: Array<[string, string]> = [
      ["创建第一个刷题集合", "folder-plus"],
      ["记录一次刷题", "file-pen-line"],
      ["新增错题卡", "square-pen"],
      ["新增复盘记录", "notebook-pen"],
      ["一键创建示例数据", "sparkles"],
    ];
    for (const [label, icon] of buttons) {
      this.renderActionButton(actions, label, icon, () => {
        if (label === "新增错题卡") {
          this.actions.createErrorCard();
          return;
        }

        if (label === "新增复盘记录") {
          this.actions.createReflectionLog();
          return;
        }

        if (label === "一键创建示例数据") {
          this.actions.createExampleData();
          return;
        }

        new Notice(`${label} 功能将在后续步骤接入。`);
      });
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
      return "夜深了，收个漂亮的尾！";
    }
    if (hour < 12) {
      return "早上好，先赢下第一组！";
    }
    if (hour < 18) {
      return "下午好，继续加油呀！";
    }
    return "晚上好，稳稳推进就好！";
  }

  private getTodayLine(): string {
    const today = new Date();
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, "0");
    const day = `${today.getDate()}`.padStart(2, "0");
    return `今天是 ${year}-${month}-${day} ${weekdays[today.getDay()]}`;
  }

  private getHeatmapMonths(model: DashboardModel): string[] {
    const months = new Set<string>();
    for (const day of model.heatmap) {
      const [, month] = day.date.split("-");
      months.add(`${Number(month)}月`);
    }
    return [...months].slice(-3);
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
