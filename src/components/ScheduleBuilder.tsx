import { Info, Code, ChevronDown } from "lucide-react";

/* ─── types ─── */

export type Frequency = "daily" | "weekly";

/* ─── constants ─── */

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export const DAYS = [
  { short: "S", full: "Sun", cron: 0 },
  { short: "M", full: "Mon", cron: 1 },
  { short: "T", full: "Tue", cron: 2 },
  { short: "W", full: "Wed", cron: 3 },
  { short: "T", full: "Thu", cron: 4 },
  { short: "F", full: "Fri", cron: 5 },
  { short: "S", full: "Sat", cron: 6 },
];

export const WEEKDAY_INDICES = [1, 2, 3, 4, 5];
export const WEEKEND_INDICES = [0, 6];
export const ALL_DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

export const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
export const MINUTES_LIST = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/* ─── helpers ─── */

export function to24(hour12: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function buildCron(cfg: {
  frequency: Frequency;
  hour12: number;
  minute: number;
  ampm: "AM" | "PM";
  weekDays: number[];
}): string {
  const h24 = to24(cfg.hour12, cfg.ampm);
  switch (cfg.frequency) {
    case "daily":
      return `${cfg.minute} ${h24} * * *`;
    case "weekly": {
      if (cfg.weekDays.length === 0) return `${cfg.minute} ${h24} * * *`;
      const sorted = [...cfg.weekDays].sort((a, b) => a - b);
      return `${cfg.minute} ${h24} * * ${sorted.join(",")}`;
    }
  }
}

export function describeSchedule(cfg: {
  frequency: Frequency;
  hour12: number;
  minute: number;
  ampm: "AM" | "PM";
  weekDays: number[];
}): string {
  const time = `${cfg.hour12}:${String(cfg.minute).padStart(2, "0")} ${cfg.ampm}`;
  switch (cfg.frequency) {
    case "daily":
      return `Every day at ${time}`;
    case "weekly": {
      if (cfg.weekDays.length === 0) return `Every day at ${time}`;
      if (cfg.weekDays.length === 7) return `Every day at ${time}`;
      const sorted = [...cfg.weekDays].sort((a, b) => a - b);
      const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === WEEKDAY_INDICES[i]);
      const isWeekends = sorted.length === 2 && sorted.every((d, i) => d === WEEKEND_INDICES[i]);
      if (isWeekdays) return `Weekdays at ${time}`;
      if (isWeekends) return `Weekends at ${time}`;
      const names = sorted.map((d) => DAYS[d].full);
      return `${names.join(", ")} at ${time}`;
    }
  }
}

/** Parse an existing cron expression back into visual builder state. Returns null if not parseable. */
export function parseCron(cron: string): {
  frequency: Frequency;
  hour12: number;
  minute: number;
  ampm: "AM" | "PM";
  weekDays: number[];
} | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minuteStr, hourStr, dom, month, dow] = parts;

  const minute = parseInt(minuteStr, 10);
  const hour24 = parseInt(hourStr, 10);
  if (isNaN(minute) || isNaN(hour24)) return null;
  if (minute < 0 || minute > 59 || hour24 < 0 || hour24 > 23) return null;
  if (dom !== "*" || month !== "*") return null;
  // Reject sub-hourly patterns like */15
  if (minuteStr.includes("/") || hourStr.includes("/")) return null;

  let hour12: number;
  let ampm: "AM" | "PM";
  if (hour24 === 0) { hour12 = 12; ampm = "AM"; }
  else if (hour24 < 12) { hour12 = hour24; ampm = "AM"; }
  else if (hour24 === 12) { hour12 = 12; ampm = "PM"; }
  else { hour12 = hour24 - 12; ampm = "PM"; }

  if (dow === "*") {
    return { frequency: "daily", hour12, minute, ampm, weekDays: WEEKDAY_INDICES };
  }

  const daySegments = dow.split(",");
  const weekDays: number[] = [];
  for (const seg of daySegments) {
    if (seg.includes("-")) {
      const [startStr, endStr] = seg.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end)) return null;
      for (let d = start; d <= end; d++) weekDays.push(d);
    } else {
      const d = parseInt(seg, 10);
      if (isNaN(d)) return null;
      weekDays.push(d);
    }
  }

  return { frequency: "weekly", hour12, minute, ampm, weekDays };
}

/* ─── TimePicker ─── */

export function TimePicker({
  hour12, setHour12,
  minute, setMinute,
  ampm, setAmpm,
}: {
  hour12: number; setHour12: (v: number) => void;
  minute: number; setMinute: (v: number) => void;
  ampm: "AM" | "PM"; setAmpm: (v: "AM" | "PM") => void;
}) {
  return (
    <div>
      <label className="mb-2.5 block text-sm font-medium text-cream">At what time</label>
      <div className="flex items-center gap-3">
        {/* Hour */}
        <div className="relative">
          <select
            value={hour12}
            onChange={(e) => setHour12(Number(e.target.value))}
            className="appearance-none rounded-lg border border-edge bg-ink pl-4 pr-8 py-2.5 text-sm font-medium text-cream transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            {HOURS_12.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        </div>

        <span className="text-lg font-bold text-muted">:</span>

        {/* Minute */}
        <div className="relative">
          <select
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="appearance-none rounded-lg border border-edge bg-ink pl-4 pr-8 py-2.5 text-sm font-medium text-cream transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            {MINUTES_LIST.map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        </div>

        {/* AM / PM */}
        <div className="flex rounded-lg border border-edge overflow-hidden">
          <button
            type="button"
            onClick={() => setAmpm("AM")}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-colors ${
              ampm === "AM"
                ? "bg-brand text-ink"
                : "bg-ink text-muted hover:text-cream"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => setAmpm("PM")}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-colors ${
              ampm === "PM"
                ? "bg-brand text-ink"
                : "bg-ink text-muted hover:text-cream"
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ScheduleBuilder ─── */

export function ScheduleBuilder({
  frequency, setFrequency,
  hour12, setHour12,
  minute, setMinute,
  ampm, setAmpm,
  weekDays, setWeekDays,
  showCustomCron, setShowCustomCron,
  customCron, setCustomCron,
}: {
  frequency: Frequency; setFrequency: (v: Frequency) => void;
  hour12: number; setHour12: (v: number) => void;
  minute: number; setMinute: (v: number) => void;
  ampm: "AM" | "PM"; setAmpm: (v: "AM" | "PM") => void;
  weekDays: number[]; setWeekDays: (v: number[]) => void;
  showCustomCron: boolean; setShowCustomCron: (v: boolean) => void;
  customCron: string; setCustomCron: (v: string) => void;
}) {
  function toggleDay(d: number) {
    setWeekDays(weekDays.includes(d) ? weekDays.filter((x) => x !== d) : [...weekDays, d]);
  }
  function setPresetDays(days: number[]) {
    const same = days.length === weekDays.length && days.every((d) => weekDays.includes(d));
    setWeekDays(same ? [] : days);
  }
  const sortedDays = [...weekDays].sort((a, b) => a - b);
  const isWeekdays = sortedDays.length === 5 && sortedDays.every((d, i) => d === WEEKDAY_INDICES[i]);
  const isWeekends = sortedDays.length === 2 && sortedDays.every((d, i) => d === WEEKEND_INDICES[i]);
  const isEveryDay = weekDays.length === 7;

  if (showCustomCron) {
    return (
      <div className="space-y-4 modal-step-enter">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-cream">Custom cron expression</label>
          <button
            type="button"
            onClick={() => setShowCustomCron(false)}
            className="text-xs text-brand hover:text-brand-light transition-colors"
          >
            Use visual builder
          </button>
        </div>
        <input
          type="text"
          value={customCron}
          onChange={(e) => setCustomCron(e.target.value)}
          placeholder="* * * * *  (min hour day month weekday)"
          autoFocus
          className="w-full rounded-lg border border-edge bg-ink px-4 py-3 font-mono text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <div className="flex items-start gap-2 rounded-lg bg-ink/50 px-3 py-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />
          <div className="text-xs text-muted leading-relaxed">
            <span className="font-mono text-subtle">minute hour day-of-month month day-of-week</span>
            <br />
            Example: <span className="font-mono text-subtle">0 9 * * 1-5</span> = Weekdays at 9 AM
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 modal-step-enter">
      {/* Frequency tabs */}
      <div>
        <label className="mb-2.5 block text-sm font-medium text-cream">Repeat every</label>
        <div className="flex gap-1 rounded-xl bg-ink p-1 border border-edge">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                frequency === f.value
                  ? "bg-brand text-ink"
                  : "text-muted hover:text-cream"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily */}
      {frequency === "daily" && (
        <div className="modal-step-enter">
          <TimePicker
            hour12={hour12} setHour12={setHour12}
            minute={minute} setMinute={setMinute}
            ampm={ampm} setAmpm={setAmpm}
          />
        </div>
      )}

      {/* Weekly */}
      {frequency === "weekly" && (
        <div className="space-y-4 modal-step-enter">
          <div>
            <label className="mb-2.5 block text-sm font-medium text-cream">On these days</label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(d.cron)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-colors ${
                    weekDays.includes(d.cron)
                      ? "border-brand bg-brand/15 text-cream"
                      : "border-edge bg-ink text-muted hover:border-edge-light hover:text-subtle"
                  }`}
                >
                  <span className="text-sm font-semibold">{d.short}</span>
                  <span className="text-[10px] opacity-60">{d.full}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPresetDays(WEEKDAY_INDICES)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isWeekdays
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-edge text-muted hover:border-edge-light hover:text-subtle"
              }`}
            >
              Weekdays
            </button>
            <button
              type="button"
              onClick={() => setPresetDays(WEEKEND_INDICES)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isWeekends
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-edge text-muted hover:border-edge-light hover:text-subtle"
              }`}
            >
              Weekends
            </button>
            <button
              type="button"
              onClick={() => setPresetDays(ALL_DAY_INDICES)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isEveryDay
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-edge text-muted hover:border-edge-light hover:text-subtle"
              }`}
            >
              Every day
            </button>
          </div>

          <TimePicker
            hour12={hour12} setHour12={setHour12}
            minute={minute} setMinute={setMinute}
            ampm={ampm} setAmpm={setAmpm}
          />
        </div>
      )}

      {/* Custom cron link */}
      <button
        type="button"
        onClick={() => setShowCustomCron(true)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-subtle transition-colors"
      >
        <Code className="h-3.5 w-3.5" strokeWidth={1.75} />
        Use custom cron expression instead
      </button>
    </div>
  );
}
