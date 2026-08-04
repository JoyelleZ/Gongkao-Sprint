import { App, PluginSettingTab, Setting } from "obsidian";
import type GongkaoSprintPlugin from "./main";
import { DEFAULT_ATTACHMENTS_DIR, DEFAULT_DATA_ROOT } from "./constants";

export interface GongkaoSprintSettings {
  dataRoot: string;
  attachmentsDir: string;
  defaultCollectionId: string;
  enableImageMasks: boolean;
  showExampleDataEntry: boolean;
  examDate: string;
}

export const DEFAULT_SETTINGS: GongkaoSprintSettings = {
  dataRoot: DEFAULT_DATA_ROOT,
  attachmentsDir: DEFAULT_ATTACHMENTS_DIR,
  defaultCollectionId: "",
  enableImageMasks: true,
  showExampleDataEntry: true,
  examDate: "",
};

export class GongkaoSprintSettingTab extends PluginSettingTab {
  private readonly plugin: GongkaoSprintPlugin;

  constructor(app: App, plugin: GongkaoSprintPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Gongkao Sprint 设置").setHeading();

    new Setting(containerEl)
      .setName("数据根目录")
      .setDesc("插件创建的 Markdown 数据会保存在该目录下。")
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_DATA_ROOT)
          .setValue(this.plugin.settings.dataRoot)
          .onChange(async (value) => {
            this.plugin.settings.dataRoot = value.trim() || DEFAULT_DATA_ROOT;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("附件目录")
      .setDesc("错题图片会复制到该目录。")
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_ATTACHMENTS_DIR)
          .setValue(this.plugin.settings.attachmentsDir)
          .onChange(async (value) => {
            this.plugin.settings.attachmentsDir = value.trim() || DEFAULT_ATTACHMENTS_DIR;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认主刷题集合")
      .setDesc("保存刷题集合 ID，用于今日计划推荐。")
      .addText((text) => {
        text.setValue(this.plugin.settings.defaultCollectionId).onChange(async (value) => {
          this.plugin.settings.defaultCollectionId = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("启用图片遮挡")
      .setDesc("新增图片错题时允许框选答案、解析或手写笔记区域。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableImageMasks).onChange(async (value) => {
          this.plugin.settings.enableImageMasks = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("显示示例数据入口")
      .setDesc("在空工作台中显示一键创建示例数据入口。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showExampleDataEntry).onChange(async (value) => {
          this.plugin.settings.showExampleDataEntry = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
