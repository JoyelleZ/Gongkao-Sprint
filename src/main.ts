import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { GongkaoSprintSettingTab, DEFAULT_SETTINGS, GongkaoSprintSettings } from "./settings";
import { VIEW_TYPE_GONGKAO_DASHBOARD } from "./constants";
import { DashboardView } from "./views/DashboardView";
import { VaultStore } from "./services/VaultStore";
import { PracticeCollectionService } from "./services/PracticeCollectionService";
import { PracticeLogService } from "./services/PracticeLogService";
import { DashboardService } from "./services/DashboardService";
import { ErrorCardService } from "./services/ErrorCardService";
import { ErrorCardModal } from "./modals/ErrorCardModal";

export default class GongkaoSprintPlugin extends Plugin {
  settings: GongkaoSprintSettings = DEFAULT_SETTINGS;
  private vaultStore!: VaultStore;
  private dashboardService!: DashboardService;
  private collectionService!: PracticeCollectionService;
  private errorCardService!: ErrorCardService;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.vaultStore = new VaultStore(this.app, () => this.settings);
    this.collectionService = new PracticeCollectionService(this.vaultStore);
    const practiceLogService = new PracticeLogService(this.vaultStore);
    this.errorCardService = new ErrorCardService(this.vaultStore);
    this.dashboardService = new DashboardService(this.collectionService, practiceLogService, this.errorCardService);

    this.registerView(
      VIEW_TYPE_GONGKAO_DASHBOARD,
      (leaf: WorkspaceLeaf) =>
        new DashboardView(leaf, this.dashboardService, () => this.settings, {
          createErrorCard: () => {
            void this.openErrorCardModal();
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

    this.addSettingTab(new GongkaoSprintSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_GONGKAO_DASHBOARD);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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

  async openErrorCardModal(): Promise<void> {
    await this.vaultStore.ensureDataDirectories();
    new ErrorCardModal(
      this.app,
      {
        errorCardService: this.errorCardService,
        collectionService: this.collectionService,
      },
      async () => {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GONGKAO_DASHBOARD);
        for (const leaf of leaves) {
          const view = leaf.view;
          if (view instanceof DashboardView) {
            await view.render();
          }
        }
      },
    ).open();
  }
}
