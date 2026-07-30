import { describe, expect, it } from "vitest";
import { ExampleDataService } from "../src/services/ExampleDataService";

describe("ExampleDataService", () => {
  it("creates a complete example data set and marker", async () => {
    const createdPaths: string[] = [];
    const service = new ExampleDataService({
      ensureDataDirectories: async () => undefined,
      getDataRoot: () => "Gongkao Sprint",
      getSubdirectoryPath: (directory: string) => `Gongkao Sprint/${directory}`,
      getFile: () => null,
      createMarkdownFile: async (path: string) => {
        createdPaths.push(path);
        return { path } as never;
      },
    } as never);

    await service.createExampleData(new Date("2026-07-30T10:00:00"));

    expect(createdPaths.some((path) => path.includes("05_专题训练/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("02_刷题记录/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("03_错题库/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("06_复盘记录/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("01_今日计划/2026-07-30.md"))).toBe(true);
    expect(createdPaths).toContain("Gongkao Sprint/示例数据说明.md");
  });

  it("does not create duplicate example data when marker exists", async () => {
    const service = new ExampleDataService({
      ensureDataDirectories: async () => undefined,
      getDataRoot: () => "Gongkao Sprint",
      getFile: () => ({ path: "Gongkao Sprint/示例数据说明.md" }),
    } as never);

    await expect(service.createExampleData(new Date("2026-07-30T10:00:00"))).rejects.toThrow("示例数据已存在");
  });
});
