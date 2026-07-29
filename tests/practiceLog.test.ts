import { describe, expect, it } from "vitest";
import { PracticeLogService } from "../src/services/PracticeLogService";
import type { PracticeLog } from "../src/types";

describe("PracticeLogService pure statistics", () => {
  it("aggregates totals by collection id and module", () => {
    const service = new PracticeLogService({} as never);
    const logs: PracticeLog[] = [
      {
        type: "gongkao-practice-log",
        date: "2026-07-29",
        collection_id: "pc-1",
        collection_name: "判断推理 500 题",
        collection_type: "topic",
        module: "判断推理",
        total: 30,
        wrong: 5,
        round: 1,
        created: "2026-07-29",
      },
      {
        type: "gongkao-practice-log",
        date: "2026-07-30",
        collection_id: "pc-1",
        collection_name: "已改名集合",
        collection_type: "topic",
        module: "资料分析",
        total: 20,
        wrong: 3,
        round: 1,
        created: "2026-07-30",
      },
      {
        type: "gongkao-practice-log",
        date: "2026-07-30",
        collection_id: "pc-2",
        collection_name: "言语理解专项",
        collection_type: "topic",
        module: "言语理解",
        total: 10,
        wrong: 1,
        round: 1,
        created: "2026-07-30",
      },
    ];

    const stats = service.calculateStats(logs, "pc-1");

    expect(stats.total).toBe(50);
    expect(stats.wrong).toBe(8);
    expect(stats.byModule["判断推理"]).toEqual({ total: 30, wrong: 5 });
    expect(stats.byModule["资料分析"]).toEqual({ total: 20, wrong: 3 });
    expect(stats.byModule["言语理解"]).toBeUndefined();
  });

  it("rejects invalid practice totals before saving", async () => {
    const service = new PracticeLogService({} as never);

    await expect(
      service.createLog({
        module: "资料分析",
        total: 10,
        wrong: 11,
      }),
    ).rejects.toThrow("错题数不能大于刷题数");
  });
});
