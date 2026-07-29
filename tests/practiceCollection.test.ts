import { describe, expect, it } from "vitest";
import { PracticeCollectionService } from "../src/services/PracticeCollectionService";
import type { PracticeCollection } from "../src/types";

describe("PracticeCollectionService", () => {
  it("creates readable collection markdown with a stable collection id", async () => {
    let capturedFrontmatter: PracticeCollection | undefined;

    const service = new PracticeCollectionService({
      getSubdirectoryPath: () => "Gongkao/Collections",
      getAvailableMarkdownPath: async () => "Gongkao/Collections/判断推理 500 题.md",
      createMarkdownFile: async (_path: string, frontmatter: PracticeCollection, body: string) => {
        capturedFrontmatter = frontmatter;
        return { path: _path, body } as never;
      },
    } as never);

    await service.createCollection({
      name: "判断推理 500 题",
      collectionType: "topic",
      module: "判断推理",
    });

    expect(capturedFrontmatter?.type).toBe("gongkao-practice-collection");
    expect(capturedFrontmatter?.collection_id).toMatch(/^pc-\d{14}-[a-z0-9]+$/u);
    expect(capturedFrontmatter?.name).toBe("判断推理 500 题");
    expect(capturedFrontmatter?.collection_type).toBe("topic");
  });
});
