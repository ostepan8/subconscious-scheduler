"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DEFAULT_ENGINE, DEFAULT_TOOLS } from "@/lib/constants";
import {
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  FileText,
  Mail,
  AlertCircle,
  Info,
  Code,
  Check,
} from "lucide-react";

type TaskType = "research" | "sync" | "digest";

interface ResendConfig { channel: "resend"; to: string; onSuccess: boolean; onFailure: boolean; customSubject?: string; customBody?: string; includeResult?: boolean; }
type ChannelConfig = ResendConfig;

/* ─── constants ─── */

type Frequency = "daily" | "weekly";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const DAYS = [
  { short: "S", full: "Sun", cron: 0 },
  { short: "M", full: "Mon", cron: 1 },
  { short: "T", full: "Tue", cron: 2 },
  { short: "W", full: "Wed", cron: 3 },
  { short: "T", full: "Thu", cron: 4 },
  { short: "F", full: "Fri", cron: 5 },
  { short: "S", full: "Sat", cron: 6 },
];

const WEEKDAY_INDICES = [1, 2, 3, 4, 5];
const WEEKEND_INDICES = [0, 6];
const ALL_DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_LIST = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const TASK_TYPES: { label: string; value: TaskType; icon: React.ReactNode; desc: string }[] = [
  {
    label: "Research",
    value: "research",
    desc: "Gather and analyze information",
    icon: <Search className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    label: "Sync",
    value: "sync",
    desc: "Keep data in sync across sources",
    icon: <RefreshCw className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    label: "Digest",
    value: "digest",
    desc: "Summarize and compile updates",
    icon: <FileText className="h-5 w-5" strokeWidth={1.5} />,
  },
];

const STEPS = ["Basics", "Instructions", "Schedule", "Delivery"];


/* ─── helpers ─── */

function to24(hour12: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function buildCron(cfg: {
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

function describeSchedule(cfg: {
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

/* ─── schedule builder ─── */

function ScheduleBuilder({
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

/* ─── time picker ─── */

function TimePicker({
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

/* ─── main component ─── */

export default function CreateTaskDialog() {
  const createTask = useMutation(api.tasks.create);
  const upsertNotifs = useMutation(api.notificationPrefs.upsert);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Step 0 — Basics
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskType>("research");

  // Step 1 — Instructions
  const [prompt, setPrompt] = useState("");

  // Step 2 — Schedule
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [weekDays, setWeekDays] = useState<number[]>(WEEKDAY_INDICES);
  const [showCustomCron, setShowCustomCron] = useState(false);
  const [customCron, setCustomCron] = useState("");

  // Step 3 — Delivery
  const [notifyChannels, setNotifyChannels] = useState<ChannelConfig[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const schedCfg = useMemo(() => ({
    frequency, hour12, minute, ampm, weekDays,
  }), [frequency, hour12, minute, ampm, weekDays]);

  const finalSchedule = showCustomCron ? customCron : buildCron(schedCfg);
  const scheduleLabel = showCustomCron
    ? (customCron || "Custom cron")
    : describeSchedule(schedCfg);

  function resetForm() {
    setName(""); setType("research"); setPrompt("");
    setFrequency("daily"); setHour12(9); setMinute(0); setAmpm("AM");
    setWeekDays(WEEKDAY_INDICES);
    setShowCustomCron(false); setCustomCron("");
    setNotifyChannels([]); setShowEmailPreview(false);
    setError(null); setStep(0);
  }

  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      resetForm();
    }, 200);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (step === 0) nameInputRef.current?.focus();
      if (step === 1) promptInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [step, isOpen]);

  function canAdvance() {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return prompt.trim().length > 0;
    if (step === 2) return showCustomCron ? customCron.trim().length > 0 : true;
    if (step === 3) return true; // delivery is optional
    return false;
  }

  function validateStep(): string | null {
    if (step === 3) {
      const email = notifyChannels[0]?.to?.trim();
      if (email && !email.includes("@")) {
        return "Please enter a valid email address.";
      }
    }
    return null;
  }

  function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }
    if (!canAdvance()) return;
    setError(null);
    if (step < 3) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) { setError(null); setStep(step - 1); }
  }

  function updateNotifyChannel(index: number, updates: Partial<ChannelConfig>) {
    setNotifyChannels(notifyChannels.map((ch, i) =>
      i === index ? ({ ...ch, ...updates } as ChannelConfig) : ch
    ));
  }

  async function handleSubmit() {
    const valErr = validateStep();
    if (valErr) { setError(valErr); return; }
    if (!name.trim() || !prompt.trim() || !finalSchedule.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const taskId = await createTask({
        name: name.trim(),
        type,
        prompt: prompt.trim(),
        schedule: finalSchedule.trim(),
        engine: DEFAULT_ENGINE,
        tools: DEFAULT_TOOLS,
      });

      if (notifyChannels.length > 0 && notifyChannels[0]?.to?.trim()) {
        await upsertNotifs({
          taskId,
          enabled: true,
          channels: notifyChannels,
        }).catch(() => {});
      }

      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        resetForm();
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Trigger button ── */
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-light"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        New Task
      </button>
    );
  }

  /* ── Modal ── */
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? "modal-backdrop-exit" : "modal-backdrop-enter"}`}
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className={`relative w-full max-w-lg rounded-2xl border border-edge bg-surface shadow-2xl shadow-black/50 flex flex-col max-h-[90vh] overflow-hidden ${isClosing ? "modal-panel-exit" : "modal-panel-enter"}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge px-6 pt-5 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-cream">Create New Task</h2>
            <p className="mt-0.5 text-xs text-muted">Step {step + 1} of {STEPS.length} &middot; {STEPS[step]}</p>
          </div>
          <button
            onClick={closeModal}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-ink hover:text-cream"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-ink shrink-0">
          <div
            className="h-full bg-brand transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 scrollbar-hide">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger modal-step-enter">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {error}
            </div>
          )}

          {/* ── Step 0: Basics ── */}
          {step === 0 && (
            <div className="space-y-5 modal-step-enter">
              <div>
                <label htmlFor="create-name" className="mb-1.5 block text-sm font-medium text-cream">
                  Task name
                </label>
                <input
                  ref={nameInputRef}
                  id="create-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canAdvance()) handleNext(); }}
                  placeholder="e.g. Weekly competitor analysis"
                  maxLength={100}
                  className="w-full rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1.5 text-xs text-muted">{name.length}/100</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-cream">Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {TASK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`group relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors ${
                        type === t.value
                          ? "border-brand bg-brand/10 text-cream"
                          : "border-edge bg-ink text-muted hover:border-edge-light hover:text-subtle"
                      }`}
                    >
                      {type === t.value && (
                        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand">
                          <Check className="h-2.5 w-2.5 text-ink" strokeWidth={3} />
                        </div>
                      )}
                      <span className={`transition-colors ${type === t.value ? "text-brand" : "text-muted group-hover:text-subtle"}`}>
                        {t.icon}
                      </span>
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className={`text-xs ${type === t.value ? "text-subtle" : "text-muted"}`}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Instructions ── */}
          {step === 1 && (
            <div className="space-y-5 modal-step-enter">
              <div>
                <label htmlFor="create-prompt" className="mb-1.5 block text-sm font-medium text-cream">
                  Agent instructions
                </label>
                <p className="mb-2 text-xs text-muted">
                  This prompt runs on every scheduled execution. Be specific about what to research, sync, or summarize.
                </p>
                <textarea
                  ref={promptInputRef}
                  id="create-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Monitor competitor pricing pages and report any changes..."
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-xs text-muted">{prompt.length}/5,000</p>
                  <p className="text-[10px] text-muted">
                    Output saved as <code className="font-mono text-brand/60">{"{{agentResponse}}"}</code>
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ── Step 2: Schedule ── */}
          {step === 2 && (
            <div className="space-y-5 modal-step-enter">
              <ScheduleBuilder
                frequency={frequency} setFrequency={setFrequency}
                hour12={hour12} setHour12={setHour12}
                minute={minute} setMinute={setMinute}
                ampm={ampm} setAmpm={setAmpm}
                weekDays={weekDays} setWeekDays={setWeekDays}
                showCustomCron={showCustomCron} setShowCustomCron={setShowCustomCron}
                customCron={customCron} setCustomCron={setCustomCron}
              />

              {/* Preview */}
              <div className="rounded-xl border border-edge bg-ink/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted mb-2">Preview</p>
                <p className="text-sm text-cream">{name || "Untitled task"}</p>
                <p className="mt-1 text-xs text-brand">{scheduleLabel}</p>
                {!showCustomCron && (
                  <p className="mt-1 font-mono text-[10px] text-muted/60">{finalSchedule}</p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">{type}</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                    Status: active <span className="text-brand/50">auto</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Delivery ── */}
          {step === 3 && (
            <div className="space-y-5 modal-step-enter">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-brand" strokeWidth={1.5} />
                  <label className="text-sm font-medium text-cream">Email notifications</label>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-ink text-muted border border-edge">
                    Optional
                  </span>
                </div>
                <p className="mb-4 text-xs text-muted">
                  Deliver agent results to your inbox after each run. Skip this to only view results in the dashboard.
                </p>

                <div className="space-y-4">
                  {/* Email address */}
                  <div>
                    <label htmlFor="notify-email" className="mb-1.5 block text-xs font-medium text-subtle">
                      Recipient
                    </label>
                    <input
                      id="notify-email"
                      type="email"
                      value={notifyChannels[0]?.to ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (notifyChannels.length === 0) {
                          setNotifyChannels([{ channel: "resend", to: val, onSuccess: true, onFailure: true, includeResult: true, customBody: "{{...agentResponse}}" }]);
                        } else {
                          updateNotifyChannel(0, { to: val });
                        }
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>

                  {/* Show options only when email is entered */}
                  {notifyChannels[0]?.to?.trim() && (
                    <>
                      {/* Subject line */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-medium text-subtle">Subject line</label>
                          <span className="text-[10px] text-muted">
                            Auto: <span className="text-subtle">{name || "Task Name"}</span>
                          </span>
                        </div>
                        <input
                          type="text"
                          value={notifyChannels[0]?.customSubject || ""}
                          onChange={(e) => updateNotifyChannel(0, { customSubject: e.target.value })}
                          placeholder="Leave empty to use task name"
                          className="w-full rounded-lg border border-edge bg-ink px-3 py-2.5 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Email body */}
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-subtle">Email body</label>
                        <textarea
                          value={notifyChannels[0]?.customBody || ""}
                          onChange={(e) => updateNotifyChannel(0, { customBody: e.target.value })}
                          placeholder="{{...agentResponse}}"
                          rows={4}
                          className="w-full rounded-lg border border-edge bg-ink px-3 py-2.5 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none font-mono"
                        />
                        <p className="mt-1 text-[10px] text-muted">
                          Use <code className="font-mono text-brand/60">{"{{...agentResponse}}"}</code> to place the agent output. Add text before or after it.
                        </p>
                      </div>

                      {/* Toggles + preview button */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifyChannels[0]?.onSuccess !== false}
                              onChange={(e) => updateNotifyChannel(0, { onSuccess: e.target.checked })}
                              className="h-4 w-4 rounded border-edge bg-ink accent-brand"
                            />
                            <span className="text-xs text-cream">On success</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifyChannels[0]?.onFailure !== false}
                              onChange={(e) => updateNotifyChannel(0, { onFailure: e.target.checked })}
                              className="h-4 w-4 rounded border-edge bg-ink accent-brand"
                            />
                            <span className="text-xs text-cream">On failure</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowEmailPreview(!showEmailPreview)}
                          className="text-xs text-brand hover:text-brand-light transition-colors"
                        >
                          {showEmailPreview ? "Hide preview" : "Preview"}
                        </button>
                      </div>

                      {/* Email preview (toggled) */}
                      {showEmailPreview && (
                        <div className="rounded-lg border border-edge overflow-hidden modal-step-enter">
                          <div className="bg-ink/80 px-3 py-2 border-b border-edge/50">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Email preview</p>
                          </div>
                          <div className="px-3 py-2.5 space-y-1 text-xs border-b border-edge/30 bg-ink/30">
                            <p>
                              <span className="text-muted">To: </span>
                              <span className="text-cream">{notifyChannels[0].to}</span>
                            </p>
                            <p>
                              <span className="text-muted">Subject: </span>
                              <span className="text-cream">
                                {notifyChannels[0].customSubject || name || "Task Name"}
                              </span>
                              {!notifyChannels[0].customSubject && (
                                <span className="ml-1.5 text-[10px] text-brand/50 font-medium">auto</span>
                              )}
                            </p>
                          </div>
                          <div className="px-3 py-3">
                            {notifyChannels[0].customBody ? (
                              <p className="text-xs text-subtle whitespace-pre-wrap">
                                {notifyChannels[0].customBody.split(/({{\.\.\.agentResponse}})/).map((part, i) =>
                                  part === "{{...agentResponse}}" ? (
                                    <span key={i} className="inline rounded bg-brand/10 px-1 py-0.5 font-mono text-[11px] text-brand/70">
                                      {"{{...agentResponse}}"}
                                    </span>
                                  ) : (
                                    <span key={i}>{part}</span>
                                  )
                                )}
                              </p>
                            ) : (
                              <p className="text-xs text-muted italic">Empty body</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-edge px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={step === 0 ? closeModal : handleBack}
            className="rounded-lg px-4 py-2 text-sm text-subtle transition-colors hover:bg-ink hover:text-cream"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-brand" : i < step ? "w-1.5 bg-brand/50" : "w-1.5 bg-edge"
                }`}
              />
            ))}
          </div>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              )}
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
