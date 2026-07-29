import { describe, expect, it } from "vitest";
import { buildDashboardModel } from "../src/services/DashboardService";
import type { PracticeCollection, PracticeLog } from "../src/types";

describe("DashboardService", () => {
  const collection: PracticeCollection = {
    type: "gongkao-practice-collection",
    collection_id: "pc-1",
    name: "判断推理 500 题",
    collection_type: "topic",
    subject: "行测",
    module: "判断推理",
    status: "first_round_done",
    current_round: 1,
    created: "2026-07-20",
    updated: "2026-07-29",
  };

  const logs: PracticeLog[] = [
    {
      type: "gongkao-practice-log",
      date: "2026-07-27",
      collection_id: "pc-1",
      collection_name: "旧名称",
      collection_type: "topic",
      module: "判断推理",
      total: 20,
      wrong: 4,
      round: 1,
      created: "2026-07-27",
    },
    {
      type: "gongkao-practice-log",
      date: "2026-07-29",
      collection_id: "pc-1",
      collection_name: "判断推理 500 题",
      collection_type: "topic",
      module: "判断推理",
      total: 30,
      wrong: 6,
      round: 2,
      created: "2026-07-29",
    },
    {
      type: "gongkao-practice-log",
      date: "2026-07-26",
      collection_id: "pc-2",
      collection_name: "资料分析高频 300 题",
      collection_type: "topic",
      module: "资料分析",
      total: 50,
      wrong: 5,
      round: 1,
      created: "2026-07-26",
    },
  ];

  it("summarizes collections by stable collection id", () => {
    const model = buildDashboardModel([{ file: { path: "collection.md" } as never, data: collection }], logs, "2026-07-29");

    expect(model.collections[0]?.total).toBe(50);
    expect(model.collections[0]?.wrong).toBe(10);
    expect(model.collections[0]?.lastPracticeDate).toBe("2026-07-29");
  });

  it("summarizes the current week from Monday to today", () => {
    const model = buildDashboardModel([{ file: { path: "collection.md" } as never, data: collection }], logs, "2026-07-29");

    expect(model.week.total).toBe(50);
    expect(model.week.wrong).toBe(10);
    expect(model.week.recentLogs).toHaveLength(3);
  });
});

