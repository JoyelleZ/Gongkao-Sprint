import { App, normalizePath, parseYaml, stringifyYaml, TFile, TFolder } from "obsidian";
import { GONGKAO_SUBDIRECTORIES } from "../constants";
import type { GongkaoSprintSettings } from "../settings";
import { sanitizeFileName } from "../utils/fileName";

type SettingsProvider = () => GongkaoSprintSettings;
type Frontmatter = object;
type MutableFrontmatter = Record<string, unknown>;

export class VaultStore {
  constructor(
    private readonly app: App,
    private readonly getSettings: SettingsProvider,
  ) {}

  getDataRoot(): string {
    return normalizePath(this.getSettings().dataRoot || "Gongkao");
  }

  getSubdirectoryPath(directory: (typeof GONGKAO_SUBDIRECTORIES)[number]): string {
    return normalizePath(`${this.getDataRoot()}/${directory}`);
  }

  async ensureDataDirectories(): Promise<void> {
    await this.ensureFolder(this.getDataRoot());

    for (const directory of GONGKAO_SUBDIRECTORIES) {
      await this.ensureFolder(this.getSubdirectoryPath(directory));
    }

    const attachmentsDir = normalizePath(this.getSettings().attachmentsDir || this.getSubdirectoryPath("Attachments"));
    await this.ensureFolder(attachmentsDir);
  }

  async ensureFolder(path: string): Promise<void> {
    const normalizedPath = normalizePath(path).replace(/\/$/u, "");
    if (!normalizedPath) {
      return;
    }

    const segments = normalizedPath.split("/");
    let current = "";

    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  async createMarkdownFile(path: string, frontmatter: Frontmatter, body: string): Promise<TFile> {
    const normalizedPath = normalizePath(path);
    const parentPath = normalizedPath.split("/").slice(0, -1).join("/");

    if (parentPath) {
      await this.ensureFolder(parentPath);
    }

    if (this.app.vault.getAbstractFileByPath(normalizedPath)) {
      throw new Error(`文件已存在：${normalizedPath}`);
    }

    return this.app.vault.create(normalizedPath, this.buildMarkdown(frontmatter, body));
  }

  async getAvailableMarkdownPath(directory: string, baseName: string): Promise<string> {
    return this.getAvailablePath(directory, `${sanitizeFileName(baseName)}.md`);
  }

  async getAvailablePath(directory: string, fileName: string): Promise<string> {
    const lastDotIndex = fileName.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0;
    const baseName = hasExtension ? fileName.slice(0, lastDotIndex) : fileName;
    const extension = hasExtension ? fileName.slice(lastDotIndex) : "";
    const safeBaseName = sanitizeFileName(baseName);
    let path = normalizePath(`${directory}/${safeBaseName}${extension}`);
    let sequence = 2;

    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${directory}/${safeBaseName}-${String(sequence).padStart(2, "0")}${extension}`);
      sequence += 1;
    }

    return path;
  }

  async readFrontmatter<T extends Frontmatter>(file: TFile): Promise<Partial<T>> {
    const cached = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (cached) {
      return cached as Partial<T>;
    }

    const content = await this.app.vault.read(file);
    const match = /^---\n([\s\S]*?)\n---/u.exec(content);
    return match ? ((parseYaml(match[1]) ?? {}) as Partial<T>) : {};
  }

  async readFile(file: TFile): Promise<string> {
    return this.app.vault.read(file);
  }

  async updateFrontmatter(file: TFile, updater: (frontmatter: MutableFrontmatter) => void): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, updater);
  }

  async copyAttachment(sourceFile: File, targetBaseName: string): Promise<string> {
    const attachmentsDir = normalizePath(this.getSettings().attachmentsDir || this.getSubdirectoryPath("Attachments"));
    await this.ensureFolder(attachmentsDir);

    const extension = sourceFile.name.split(".").pop() ?? "png";
    const targetName = `${sanitizeFileName(targetBaseName)}.${extension}`;
    const finalPath = await this.getAvailablePath(attachmentsDir, targetName);

    await this.app.vault.adapter.writeBinary(finalPath, await sourceFile.arrayBuffer());
    return finalPath;
  }

  getFolder(path: string): TFolder | null {
    const abstractFile = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return abstractFile instanceof TFolder ? abstractFile : null;
  }

  getFile(path: string): TFile | null {
    const abstractFile = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return abstractFile instanceof TFile ? abstractFile : null;
  }

  buildMarkdown(frontmatter: Frontmatter, body: string): string {
    const yaml = stringifyYaml(frontmatter).trim();
    return `---\n${yaml}\n---\n\n${body.trim()}\n`;
  }
}
