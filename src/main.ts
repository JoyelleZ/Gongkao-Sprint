import { normalizePath, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { GongkaoSprintSettingTab, DEFAULT_SETTINGS, GongkaoSprintSettings } from "./settings";
import { VIEW_TYPE_GONGKAO_DASHBOARD, VIEW_TYPE_GONGKAO_REVIEW } from "./constants";
import { DashboardView } from "./views/DashboardView";
import { VaultStore } from "./services/VaultStore";
import { PracticeCollectionService } from "./services/PracticeCollectionService";
import { PracticeLogService } from "./services/PracticeLogService";
import { DashboardService } from "./services/DashboardService";
import { ErrorCardService } from "./services/ErrorCardService";
import { ErrorCardModal } from "./modals/ErrorCardModal";
import { ReflectionLogService } from "./services/ReflectionLogService";
import { ReflectionLogModal } from "./modals/ReflectionLogModal";
import { ReviewSessionView } from "./views/ReviewSessionView";
import { DailyPlanService } from "./services/DailyPlanService";
import { ExampleDataService } from "./services/ExampleDataService";
import { PracticeCollectionModal } from "./modals/PracticeCollectionModal";
import { PracticeLogModal } from "./modals/PracticeLogModal";
import { ExamCountdownService } from "./services/ExamCountdownService";
import { ExamCountdownModal } from "./modals/ExamCountdownModal";

export default class GongkaoSprintPlugin extends Plugin {
  settings: GongkaoSprintSettings = DEFAULT_SETTINGS;
  private coverImageSrc = "";
  private mobileCoverImageSrc = "";
  private vaultStore!: VaultStore;
  private dashboardService!: DashboardService;
  private collectionService!: PracticeCollectionService;
  private errorCardService!: ErrorCardService;
  private reflectionLogService!: ReflectionLogService;
  private dailyPlanService!: DailyPlanService;
  private practiceLogService!: PracticeLogService;
  private examCountdownService!: ExamCountdownService;
  private exampleDataService!: ExampleDataService;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.coverImageSrc = await this.resolveCoverImageSrc();
    this.mobileCoverImageSrc = await this.resolveMobileCoverImageSrc();
    this.vaultStore = new VaultStore(this.app, () => this.settings);
    this.collectionService = new PracticeCollectionService(this.vaultStore);
    this.practiceLogService = new PracticeLogService(this.vaultStore);
    this.errorCardService = new ErrorCardService(this.vaultStore);
    this.reflectionLogService = new ReflectionLogService(this.vaultStore);
    this.dailyPlanService = new DailyPlanService(this.vaultStore);
    this.examCountdownService = new ExamCountdownService(this.vaultStore);
    this.exampleDataService = new ExampleDataService(this.vaultStore);
    this.dashboardService = new DashboardService(
      this.collectionService,
      this.practiceLogService,
      this.errorCardService,
      this.reflectionLogService,
      this.dailyPlanService,
      this.examCountdownService,
    );
    await this.migrateLegacyExamDate();

    this.registerView(
      VIEW_TYPE_GONGKAO_DASHBOARD,
      (leaf: WorkspaceLeaf) =>
        new DashboardView(leaf, this.dashboardService, this.coverImageSrc, this.mobileCoverImageSrc, {
          createErrorCard: () => {
            void this.openErrorCardModal();
          },
          createReflectionLog: () => {
            void this.openReflectionLogModal();
          },
          createPracticeLog: () => {
            void this.openPracticeLogModal();
          },
          createPracticeCollection: () => {
            void this.openPracticeCollectionModal();
          },
          manageExamCountdowns: () => {
            void this.openExamCountdownModal();
          },
          startReview: () => {
            void this.activateReview();
          },
          generateDailyPlan: () => {
            void this.generateDailyPlan();
          },
          createExampleData: () => {
            void this.createExampleData();
          },
          openFile: (file?: TFile) => {
            void this.openMarkdownFile(file);
          },
        }),
    );

    this.registerView(
      VIEW_TYPE_GONGKAO_REVIEW,
      (leaf: WorkspaceLeaf) =>
        new ReviewSessionView(leaf, this.errorCardService, {
          onReviewed: async () => {
            await this.refreshDashboards();
          },
        }),
    );

    this.addRibbonIcon("sprout", "打开 Gongkao Sprint 工作台", () => {
      void this.activateDashboard();
    });

    this.addCommand({
      id: "open-gongkao-dashboard",
      name: "Open Gongkao Dashboard",
      callback: () => {
        void this.activateDashboard();
      },
    });

    this.addCommand({
      id: "initialize-gongkao-data-directories",
      name: "Initialize Gongkao Data Directories",
      callback: () => {
        void this.ensureDataDirectories();
      },
    });

    this.addCommand({
      id: "create-error-card",
      name: "Create Error Card",
      callback: () => {
        void this.openErrorCardModal();
      },
    });

    this.addCommand({
      id: "create-reflection-log",
      name: "Create Reflection Log",
      callback: () => {
        void this.openReflectionLogModal();
      },
    });

    this.addCommand({
      id: "start-error-card-review",
      name: "Start Error Card Review",
      callback: () => {
        void this.activateReview();
      },
    });

    this.addCommand({
      id: "generate-daily-plan",
      name: "Generate Daily Plan",
      callback: () => {
        void this.generateDailyPlan();
      },
    });

    this.addCommand({
      id: "create-practice-log",
      name: "Create Practice Log",
      callback: () => {
        void this.openPracticeLogModal();
      },
    });

    this.addCommand({
      id: "create-practice-collection",
      name: "Create Practice Collection",
      callback: () => {
        void this.openPracticeCollectionModal();
      },
    });

    this.addCommand({
      id: "manage-exam-countdowns",
      name: "Manage Exam Countdowns",
      callback: () => {
        void this.openExamCountdownModal();
      },
    });

    this.addCommand({
      id: "create-example-data",
      name: "Create Example Data",
      callback: () => {
        void this.createExampleData();
      },
    });

    this.addSettingTab(new GongkaoSprintSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_GONGKAO_DASHBOARD);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_GONGKAO_REVIEW);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    let migrated = false;
    if (this.settings.dataRoot === "Gongkao") {
      this.settings.dataRoot = DEFAULT_SETTINGS.dataRoot;
      migrated = true;
    }
    if (this.settings.attachmentsDir === "Gongkao/Attachments") {
      this.settings.attachmentsDir = DEFAULT_SETTINGS.attachmentsDir;
      migrated = true;
    }
    if (this.settings.attachmentsDir === "Gongkao Sprint/08_资料资源/Attachments") {
      this.settings.attachmentsDir = DEFAULT_SETTINGS.attachmentsDir;
      migrated = true;
    }
    if (migrated) {
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateDashboard(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GONGKAO_DASHBOARD);
    let leaf = leaves[0];

    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_GONGKAO_DASHBOARD, active: true });
    }

    this.app.workspace.revealLeaf(leaf);
  }

  async ensureDataDirectories(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    new Notice("Gongkao Sprint 数据目录已准备好。");
  }

  async activateReview(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GONGKAO_REVIEW);
    let leaf = leaves[0];

    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_GONGKAO_REVIEW, active: true });
    }

    this.app.workspace.revealLeaf(leaf);
  }

  async openErrorCardModal(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    new ErrorCardModal(
      this.app,
      {
        errorCardService: this.errorCardService,
        collectionService: this.collectionService,
      },
      async () => {
        await this.refreshDashboards();
      },
    ).open();
  }

  async openReflectionLogModal(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    new ReflectionLogModal(
      this.app,
      {
        reflectionLogService: this.reflectionLogService,
        collectionService: this.collectionService,
      },
      async () => {
        await this.refreshDashboards();
      },
    ).open();
  }

  async openPracticeCollectionModal(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    new PracticeCollectionModal(
      this.app,
      {
        collectionService: this.collectionService,
      },
      async () => {
        await this.refreshDashboards();
      },
    ).open();
  }

  async openPracticeLogModal(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    new PracticeLogModal(
      this.app,
      {
        collectionService: this.collectionService,
        practiceLogService: this.practiceLogService,
        openPracticeCollectionModal: () => {
          void this.openPracticeCollectionModal();
        },
      },
      async () => {
        await this.refreshDashboards();
      },
    ).open();
  }

  async openExamCountdownModal(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    new ExamCountdownModal(
      this.app,
      {
        examCountdownService: this.examCountdownService,
      },
      async () => {
        await this.refreshDashboards();
      },
    ).open();
  }

  private async migrateLegacyExamDate(): Promise<void> {
    if (!this.settings.examDate) {
      return;
    }

    try {
      const existing = await this.examCountdownService.listCountdowns();
      if (existing.length === 0) {
        await this.examCountdownService.createCountdown({
          name: "考试倒计时",
          date: this.settings.examDate,
        });
      }

      this.settings.examDate = "";
      await this.saveSettings();
    } catch {
      return;
    }
  }

  async generateDailyPlan(): Promise<void> {
    try {
      await this.vaultStore.ensureDataDirectories();
      const dueCards = (await this.errorCardService.listDueCards()).map((entry) => entry.data);
      const collections = await this.collectionService.listCollections();
      const defaultCollection =
        collections.find((entry) => entry.data.collection_id === this.settings.defaultCollectionId)?.data ??
        collections.find((entry) => entry.data.status === "active")?.data;
      const reflections = (await this.reflectionLogService.listLogs({ dateFrom: this.recentDate(7) })).map((entry) => entry.data);

      await this.dailyPlanService.generatePlan({
        dueCards,
        defaultCollection,
        recentReflections: reflections,
      });

      new Notice("今日计划已生成。");
      await this.refreshDashboards();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "今日计划生成失败。");
    }
  }

  async createExampleData(): Promise<void> {
    try {
      await this.exampleDataService.createExampleData();
      new Notice("示例数据已创建。");
      await this.refreshDashboards();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "示例数据创建失败。");
    }
  }

  private async openMarkdownFile(file?: TFile): Promise<void> {
    if (!file) {
      new Notice("没有找到对应的 Markdown 文件。");
      return;
    }

    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file);
    this.app.workspace.revealLeaf(leaf);
  }

  private async refreshDashboards(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GONGKAO_DASHBOARD);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof DashboardView) {
        await view.render();
      }
    }
  }

  private recentDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
  }

  private async resolveCoverImageSrc(): Promise<string> {
    return this.resolvePluginAssetSrc("assets/frontcover.png", "Banner");
  }

  private async resolveMobileCoverImageSrc(): Promise<string> {
    return this.resolvePluginAssetSrc("assets/mobilecover.png", "Mobile banner", "assets/frontcover.png");
  }

  private async resolvePluginAssetSrc(assetPath: string, label: string, fallbackAssetPath?: string): Promise<string> {
    const pluginDir = this.manifest.dir ?? "";
    const fullPath = normalizePath(`${pluginDir}/${assetPath}`);
    const exists = await this.app.vault.adapter.exists(fullPath);
    const resourcePath = this.app.vault.adapter.getResourcePath(fullPath);
    if (!exists && fallbackAssetPath) {
      const fallbackPath = normalizePath(`${pluginDir}/${fallbackAssetPath}`);
      const fallbackExists = await this.app.vault.adapter.exists(fallbackPath);
      const fallbackResourcePath = this.app.vault.adapter.getResourcePath(fallbackPath);
      if (fallbackExists) {
        return fallbackResourcePath;
      }
    }
    return resourcePath;
  }
}
