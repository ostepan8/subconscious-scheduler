import cronParser from "cron-parser";

export function getNextRunTime(schedule: string): string | null {
  try {
    const interval = cronParser.parseExpression(schedule);
    return interval.next().toISOString();
  } catch {
    return null;
  }
}

export function isDue(schedule: string, lastRunAt: string | null): boolean {
  try {
    const interval = cronParser.parseExpression(schedule);
    const prev = interval.prev().toDate();
    if (!lastRunAt) return true;
    return new Date(lastRunAt) < prev;
  } catch {
    return false;
  }
}

export function formatSchedule(schedule: string): string {
  const presets: Record<string, string> = {
    "0 0 * * *": "Daily at midnight",
    "0 8 * * *": "Daily at 8 AM",
    "0 9 * * *": "Daily at 9 AM",
    "0 8 * * 1": "Weekly on Monday at 8 AM",
    "0 8 * * 1-5": "Weekdays at 8 AM",
    "0 9 * * 1-5": "Weekdays at 9 AM",
    "0 9 * * 1": "Weekly on Monday at 9 AM",
    "0 9 * * 0": "Weekly on Sunday at 9 AM",
  };
  return presets[schedule] || schedule;
}

export function isValidCron(schedule: string): boolean {
  try {
    cronParser.parseExpression(schedule);
    return true;
  } catch {
    return false;
  }
}
