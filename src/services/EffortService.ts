import type { EffortDay, ErrorCard, PracticeLog, ReflectionLog } from "../types";
import { addDays, formatDate } from "../utils/date";

export interface HeatmapDay extends EffortDay {
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  tooltip: string;
}

export interface HeatmapLayoutCell {
  day: HeatmapDay;
  row: number;
  column: number;
}

export interface HeatmapMonthLabel {
  label: string;
  column: number;
}

export interface HeatmapLayout {
  cells: HeatmapLayoutCell[];
  months: HeatmapMonthLabel[];
  totalColumns: number;
}

export function buildEffortHeatmap(
  logs: PracticeLog[],
  cards: ErrorCard[],
  reflections: ReflectionLog[],
  endDate: string,
  days = 90,
): HeatmapDay[] {
  const dates = generateLastDays(endDate, days);
  const practiceByDate = groupPracticeByDate(logs);
  const reviewByDate = groupReviewsByDate(cards);
  const reflectionsByDate = groupReflectionsByDate(reflections);

  return dates.map((date) => {
    const practiceTotal = practiceByDate.get(date) ?? 0;
    const reviewCount = reviewByDate.get(date) ?? 0;
    const reflectionCount = reflectionsByDate.get(date) ?? 0;
    const planCompletionRate = 0;
    const effortScore = calculateEffortScore(practiceTotal, reviewCount, reflectionCount, planCompletionRate);
    const count = practiceTotal + reviewCount + reflectionCount;

    return {
      date,
      count,
      practiceTotal,
      reviewCount,
      reflectionCount,
      planCompletionRate,
      effortScore,
      level: toHeatmapLevel(effortScore),
      tooltip: `${date}｜刷题 ${practiceTotal}｜复习 ${reviewCount}｜复盘 ${reflectionCount}｜计划 0%`,
    };
  });
}

export function generateLast90Days(endDate: string): Array<{ date: string; count: number }> {
  return generateLastDays(endDate, 90).map((date) => ({ date, count: 0 }));
}

export function buildHeatmapLayout(days: HeatmapDay[]): HeatmapLayout {
  const firstDate = days[0] ? parseLocalDate(days[0].date) : parseLocalDate(formatDate(new Date()));
  const epochMonday = getWeekMonday(firstDate);
  const cells = days.map((day) => {
    const date = parseLocalDate(day.date);
    return {
      day,
      row: getMondayFirstWeekday(date),
      column: Math.floor(daysBetweenDates(epochMonday, date) / 7) + 1,
    };
  });
  const totalColumns = Math.max(1, ...cells.map((cell) => cell.column));
  const months = buildFixedMonthLabels(days, cells);

  return { cells, months, totalColumns };
}

export function calculateEffortScore(
  practiceTotal: number,
  reviewCount: number,
  reflectionCount: number,
  planCompletionRate: number,
): number {
  const practiceScore = Math.min(60, practiceTotal);
  const reviewScore = Math.min(24, reviewCount * 4);
  const reflectionScore = Math.min(16, reflectionCount * 8);
  const planScore = Math.round(Math.max(0, Math.min(1, planCompletionRate)) * 20);

  return practiceScore + reviewScore + reflectionScore + planScore;
}

export function toHeatmapLevel(score: number): HeatmapDay["level"] {
  if (score <= 0) return 0;
  if (score < 20) return 1;
  if (score < 45) return 2;
  if (score < 80) return 3;
  return 4;
}

function generateLastDays(endDate: string, days: number): string[] {
  const end = parseLocalDate(endDate);
  const start = addDays(end, -(days - 1));
  const result: string[] = [];

  for (let index = 0; index < days; index += 1) {
    result.push(formatDate(addDays(start, index)));
  }

  return result;
}

function buildFixedMonthLabels(days: HeatmapDay[], cells: HeatmapLayoutCell[]): HeatmapMonthLabel[] {
  const byMonth = new Map<string, HeatmapMonthLabel>();

  for (let index = 0; index < days.length; index += 1) {
    const day = days[index];
    const cell = cells[index];
    const monthKey = day.date.slice(0, 7);
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, {
        label: `${Number(day.date.slice(5, 7))}月`,
        column: cell.column,
      });
    }
  }

  return [...byMonth.values()].slice(-3);
}

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function getWeekMonday(date: Date): Date {
  const monday = new Date(date);
  const weekday = monday.getDay();
  monday.setDate(monday.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getMondayFirstWeekday(date: Date): number {
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
}

function daysBetweenDates(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function groupPracticeByDate(logs: PracticeLog[]): Map<string, number> {
  const grouped = new Map<string, number>();

  for (const log of logs) {
    grouped.set(log.date, (grouped.get(log.date) ?? 0) + log.total);
  }

  return grouped;
}

function groupReviewsByDate(cards: ErrorCard[]): Map<string, number> {
  const grouped = new Map<string, number>();

  for (const card of cards) {
    for (const history of card.review_history ?? []) {
      grouped.set(history.date, (grouped.get(history.date) ?? 0) + 1);
    }
  }

  return grouped;
}

function groupReflectionsByDate(reflections: ReflectionLog[]): Map<string, number> {
  const grouped = new Map<string, number>();

  for (const reflection of reflections) {
    grouped.set(reflection.date, (grouped.get(reflection.date) ?? 0) + 1);
  }

  return grouped;
}
