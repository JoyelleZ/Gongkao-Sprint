import { describe, expect, it } from "vitest";
import { ReflectionLogService } from "../src/services/ReflectionLogService";
import type { ReflectionLog } from "../src/types";

describe("ReflectionLogService", () => {
  it("creates structured reflection logs with stable ids", async () => {
    let capturedLog: ReflectionLog | undefined;
    let capturedBody = "";

    const service = new ReflectionLogService({
      getSubdirectoryPath: () => "Gongkao Sprint/06_复盘记录",
      getAvailableMarkdownPath: async () => "Gongkao Sprint/06_复盘记录/2026-07-30-思维惯性-判断推理-001.md",
      createMarkdownFile: async (_path: string, frontmatter: ReflectionLog, body: string) => {
        capturedLog = frontmatter;
        capturedBody = body;
        return { path: _path } as never;
      },
    } as never);

    await service.createLog(
      {
        scope: "module",
        module: "判断推理",
        reflectionType: "思维惯性",
        trigger: "图推连续两题急着找对称轴",
        problem: "默认先看熟悉规律，忽略了元素数量变化",
        method: "先扫数量、位置、样式三类，再进入细规律",
        nextAction: "下次图推先写 3 秒检查顺序",
      },
      new Date("2026-07-30T10:00:00"),
    );

    expect(capturedLog?.type).toBe("gongkao-reflection-log");
    expect(capturedLog?.reflection_id).toMatch(/^rf-\d{14}-[a-z0-9]+$/u);
    expect(capturedLog?.module).toBe("判断推理");
    expect(capturedBody).toContain("## 触发场景");
    expect(capturedBody).toContain("## 下次纠偏动作");
  });

  it("rejects missing required structured fields", async () => {
    const service = new ReflectionLogService({} as never);

    await expect(
      service.createLog({
        scope: "daily",
        reflectionType: "技巧沉淀",
        trigger: "",
        problem: "问题",
        method: "方法",
        nextAction: "动作",
      }),
    ).rejects.toThrow("请填写触发场景");
  });
});

