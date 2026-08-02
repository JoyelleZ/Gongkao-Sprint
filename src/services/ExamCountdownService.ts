import type { TFile } from "obsidian";
import type { ExamCountdown } from "../types";
import { daysBetween, todayString } from "../utils/date";
import { createStableId } from "../utils/id";
import type { VaultStore } from "./VaultStore";

interface DashboardFrontmatter {
  exam_countdowns?: ExamCountdown[];
}

export interface CountdownInput {
  name: string;
  date: string;
}

export interface CountdownSummary {
  countdown?: ExamCountdown;
  days?: number;
  status: "unset" | "upcoming" | "today" | "past";
}

export class ExamCountdownService {
  constructor(private readonly store: VaultStore) {}

  async listCountdowns(): Promise<Array<{ file: TFile; data: ExamCountdown }>> {
    await this.store.ensureDataDirectories();
    const file = await this.store.ensureDashboardFile();
    const frontmatter = await this.store.readFrontmatter<DashboardFrontmatter>(file);
    return normalizeCountdowns(frontmatter.exam_countdowns).map((countdown) => ({ file, data: countdown }));
  }

  async createCountdown(input: CountdownInput, now = new Date()): Promise<ExamCountdown> {
    const name = input.name.trim();
    const date = input.date.trim();
    validateCountdownInput(name, date);

    await this.store.ensureDataDirectories();
    const file = await this.store.ensureDashboardFile();
    const created = todayString(now);
    const countdown: ExamCountdown = {
      countdown_id: createStableId("exam", now),
      name,
      date,
      enabled: true,
      created,
      updated: created,
    };

    await this.store.updateFrontmatter(file, (frontmatter) => {
      const current = normalizeCountdowns(frontmatter.exam_countdowns as ExamCountdown[] | undefined);
      frontmatter.exam_countdowns = sortCountdowns([...current, countdown]);
    });

    return countdown;
  }

  async deleteCountdown(countdownId: string): Promise<void> {
    await this.store.ensureDataDirectories();
    const file = await this.store.ensureDashboardFile();
    await this.store.updateFrontmatter(file, (frontmatter) => {
      const current = normalizeCountdowns(frontmatter.exam_countdowns as ExamCountdown[] | undefined);
      frontmatter.exam_countdowns = current.filter((countdown) => countdown.countdown_id !== countdownId);
    });
  }
}

export function buildCountdownSummary(countdowns: ExamCountdown[], today = todayString()): CountdownSummary {
  const enabled = sortCountdowns(countdowns.filter((countdown) => countdown.enabled));
  if (enabled.length === 0) {
    return { status: "unset" };
  }

  const upcoming = enabled.find((countdown) => daysBetween(today, countdown.date) >= 0);
  if (upcoming) {
    const days = daysBetween(today, upcoming.date);
    return {
      countdown: upcoming,
      days,
      status: days === 0 ? "today" : "upcoming",
    };
  }

  const latestPast = [...enabled].sort((a, b) => b.date.localeCompare(a.date))[0];
  return { countdown: latestPast, status: "past" };
}

export function normalizeCountdowns(value: unknown): ExamCountdown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return sortCountdowns(
    value
      .filter((item): item is Partial<ExamCountdown> => typeof item === "object" && item !== null)
      .map((item) => ({
        countdown_id: String(item.countdown_id ?? ""),
        name: String(item.name ?? "").trim(),
        date: String(item.date ?? "").trim(),
        enabled: item.enabled !== false,
        created: String(item.created ?? ""),
        updated: String(item.updated ?? item.created ?? ""),
      }))
      .filter((item): item is ExamCountdown => Boolean(item.countdown_id && item.name && isDateString(item.date))),
  );
}

function sortCountdowns(countdowns: ExamCountdown[]): ExamCountdown[] {
  return [...countdowns].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

function validateCountdownInput(name: string, date: string): void {
  if (!name) {
    throw new Error("请填写考试名称。");
  }
  if (!isDateString(date)) {
    throw new Error("考试日期格式应为 YYYY-MM-DD。");
  }
}

function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
