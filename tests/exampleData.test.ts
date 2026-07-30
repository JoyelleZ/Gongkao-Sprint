import { describe, expect, it } from "vitest";
import { ExampleDataService } from "../src/services/ExampleDataService";

describe("ExampleDataService", () => {
  it("creates a complete example data set and marker", async () => {
    const createdPaths: string[] = [];
    const service = new ExampleDataService({
      ensureDataDirectories: async () => undefined,
      getDataRoot: () => "Gongkao",
      getSubdirectoryPath: (directory: string) => `Gongkao/${directory}`,
      getFile: () => null,
      createMarkdownFile: async (path: string) => {
        createdPaths.push(path);
        return { path } as never;
      },
    } as never);

    await service.createExampleData(new Date("2026-07-30T10:00:00"));

    expect(createdPaths.some((path) => path.includes("Collections/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("PracticeLogs/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("ErrorCards/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("Reflections/示例-"))).toBe(true);
    expect(createdPaths.some((path) => path.includes("Plans/2026-07-30-示例今日计划.md"))).toBe(true);
    expect(createdPaths).toContain("Gongkao/示例数据说明.md");
  });

  it("does not create duplicate example data when marker exists", async () => {
    const service = new ExampleDataService({
      ensureDataDirectories: async () => undefined,
      getDataRoot: () => "Gongkao",
      getFile: () => ({ path: "Gongkao/示例数据说明.md" }),
    } as never);

    await expect(service.createExampleData(new Date("2026-07-30T10:00:00"))).rejects.toThrow("示例数据已存在");
  });
});
