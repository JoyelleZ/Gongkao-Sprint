import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { GongkaoSprintSettingTab, DEFAULT_SETTINGS, GongkaoSprintSettings } from "./settings";
import { VIEW_TYPE_GONGKAO_DASHBOARD } from "./constants";
import { DashboardView } from "./views/DashboardView";
import { VaultStore } from "./services/VaultStore";

export default class GongkaoSprintPlugin extends Plugin {
  settings: GongkaoSprintSettings = DEFAULT_SETTINGS;
  private vaultStore!: VaultStore;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.vaultStore = new VaultStore(this.app, () => this.settings);

    this.registerView(
      VIEW_TYPE_GONGKAO_DASHBOARD,
      (leaf: WorkspaceLeaf) => new DashboardView(leaf),
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
}
