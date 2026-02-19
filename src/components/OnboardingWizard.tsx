"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { DEFAULT_ENGINE, DEFAULT_TOOLS } from "@/lib/constants";
import {
  Sparkles,
  ChevronRight,
  Check,
  Rocket,
  Newspaper,
  TrendingUp,
  Cloud,
  Mail,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  type Frequency,
  WEEKDAY_INDICES,
  buildCron,
  describeSchedule,
  ScheduleBuilder,
} from "./ScheduleBuilder";

/* ─── Types ─── */

interface Template {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  name: string;
  prompt: string;
  frequency: Frequency;
  hour12: number;
  minute: number;
  ampm: "AM" | "PM";
  weekDays: number[];
  color: string;
  bg: string;
}

/* ─── Constants ─── */

const TEMPLATES: Template[] = [
  {
    id: "news-digest",
    icon: <Newspaper className="h-6 w-6" strokeWidth={1.5} />,
    label: "Morning News Brief",
    description: "Get a daily summary of the latest news on any topic",
    name: "Morning News Brief",
    prompt:
      "Search for the top news stories from the past 24 hours about technology and AI. Summarize the 5 most important stories with a one-paragraph summary each. Include the source and a link for each story.",
    frequency: "daily",
    hour12: 8,
    minute: 0,
    ampm: "AM",
    weekDays: WEEKDAY_INDICES,
    color: "text-brand",
    bg: "bg-brand/10",
  },
  {
    id: "competitor-research",
    icon: <TrendingUp className="h-6 w-6" strokeWidth={1.5} />,
    label: "Weekly Research Report",
    description: "Research competitors, markets, or any topic weekly",
    name: "Weekly Research Report",
    prompt:
      "Research the latest developments, product updates, and pricing changes from our main competitors. Compare features, identify new trends, and summarize key takeaways in a structured report.",
    frequency: "weekly",
    hour12: 9,
    minute: 0,
    ampm: "AM",
    weekDays: [1],
    color: "text-teal",
    bg: "bg-teal/10",
  },
  {
    id: "weather-brief",
    icon: <Cloud className="h-6 w-6" strokeWidth={1.5} />,
    label: "Daily Weather & Plan",
    description: "Personalized weather forecast and recommendation",
    name: "Daily Weather Brief",
    prompt:
      "Get today's weather forecast for San Francisco, CA. Include the high/low temperature, conditions, and a recommendation for what to wear and whether it's a good day for outdoor activities.",
    frequency: "daily",
    hour12: 7,
    minute: 0,
    ampm: "AM",
    weekDays: WEEKDAY_INDICES,
    color: "text-lime",
    bg: "bg-lime/10",
  },
  {
    id: "custom",
    icon: <Sparkles className="h-6 w-6" strokeWidth={1.5} />,
    label: "Start from Scratch",
    description: "Build a completely custom task",
    name: "",
    prompt: "",
    frequency: "daily",
    hour12: 9,
    minute: 0,
    ampm: "AM",
    weekDays: WEEKDAY_INDICES,
    color: "text-subtle",
    bg: "bg-surface",
  },
];

/* ─── Typewriter hook ─── */

function useTypewriter(text: string, speed: number = 20, enabled: boolean = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayed, done };
}

/* ─── Auth error helper ─── */

function getAuthError(err: unknown, flow: "signIn" | "signUp"): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes("timed out")) return "Request timed out. Please try again.";
  if (lower.includes("fetch") || lower.includes("network")) return "Network error. Check your connection.";
  if (flow === "signIn") {
    if (lower.includes("could not verify") || lower.includes("invalid") || lower.includes("wrong password"))
      return "Invalid email or password.";
    if (lower.includes("not found") || lower.includes("no user") || lower.includes("does not exist"))
      return "No account found. Try signing up instead.";
  }
  if (flow === "signUp") {
    if (lower.includes("already exists") || lower.includes("duplicate") || lower.includes("unique"))
      return "Account already exists. Try signing in instead.";
    if (lower.includes("weak") || lower.includes("short"))
      return "Password too weak. Use at least 8 characters.";
  }
  return flow === "signIn"
    ? "Sign-in failed. Please check your email and password."
    : "Sign-up failed. Please try again.";
}

/* ─══════════════════════════════════════════════════════─ */
/* ─── MAIN COMPONENT                                   ─ */
/* ─══════════════════════════════════════════════════════─ */

export default function OnboardingWizard() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const createTask = useMutation(api.tasks.create);
  const upsertNotifs = useMutation(api.notificationPrefs.upsert);

  /* ── Step management ── */
  // 0 = Welcome, 2 = Pick template,
  // 3 = Name+Type, 4 = Prompt, 5 = Schedule, 6 = Review+Launch, 7 = Success
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Task fields ── */
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templatePrompt, setTemplatePrompt] = useState("");
  const [typewriterEnabled, setTypewriterEnabled] = useState(true);

  /* ── Schedule fields ── */
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [weekDays, setWeekDays] = useState<number[]>(WEEKDAY_INDICES);
  const [showCustomCron, setShowCustomCron] = useState(false);
  const [customCron, setCustomCron] = useState("");

  /* ── Notification fields ── */
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);

  /* ── Auth fields (for unauthenticated users) ── */
  const [authFlow, setAuthFlow] = useState<"signUp" | "signIn">("signUp");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  /* ── Refs ── */
  const nameRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  /* ── Schedule computed ── */
  const schedCfg = useMemo(() => ({
    frequency, hour12, minute, ampm, weekDays,
  }), [frequency, hour12, minute, ampm, weekDays]);

  const finalSchedule = showCustomCron ? customCron : buildCron(schedCfg);
  const scheduleLabel = showCustomCron
    ? (customCron || "Custom cron")
    : describeSchedule(schedCfg);

  /* ── Typewriter for name (step 3) ── */
  const { displayed: typewriterName, done: typewriterNameDone } = useTypewriter(
    templateName,
    25,
    typewriterEnabled && step === 3,
  );

  // Sync typewriter output to name state
  useEffect(() => {
    if (step === 3 && typewriterEnabled) {
      setName(typewriterName);
    }
  }, [typewriterName, step, typewriterEnabled]);

  /* ── Typewriter for prompt (step 4) ── */
  const { displayed: typewriterPrompt, done: typewriterDone } = useTypewriter(
    templatePrompt,
    3,
    typewriterEnabled && step === 4,
  );

  // Sync typewriter output to prompt state
  useEffect(() => {
    if (step === 4 && typewriterEnabled) {
      setPrompt(typewriterPrompt);
    }
  }, [typewriterPrompt, step, typewriterEnabled]);

  /* ── Auto-focus ── */
  useEffect(() => {
    if (step === 3 && (!typewriterEnabled || typewriterNameDone)) {
      const timer = setTimeout(() => nameRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
    if (step === 4 && typewriterDone) {
      const timer = setTimeout(() => promptRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [step, typewriterEnabled, typewriterNameDone, typewriterDone]);

  /* ── Template selection ── */
  function selectTemplate(template: Template) {
    setTemplateName(template.name);
    setTemplatePrompt(template.prompt);
    if (template.id === "custom") {
      setName("");
      setPrompt("");
      setTypewriterEnabled(false);
    } else {
      setName("");
      setPrompt("");
      setTypewriterEnabled(true);
    }
    setFrequency(template.frequency);
    setHour12(template.hour12);
    setMinute(template.minute);
    setAmpm(template.ampm);
    setWeekDays(template.weekDays);
    setShowCustomCron(false);
    setCustomCron("");
    setError(null);
    setStep(3);
  }

  /* ── Create task (called after auth is confirmed) ── */
  async function doCreateTask() {
    try {
      const taskId = await createTask({
        name: name.trim(),
        prompt: prompt.trim(),
        schedule: finalSchedule.trim(),
        engine: DEFAULT_ENGINE,
        tools: DEFAULT_TOOLS,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (notifyEmail.trim()) {
        await upsertNotifs({
          taskId,
          enabled: true,
          channels: [{
            channel: "resend" as const,
            to: notifyEmail.trim(),
            onSuccess: notifyOnSuccess,
            onFailure: notifyOnFailure,
            includeResult: true,
            customBody: "{{...agentResponse}}",
          }],
        }).catch(() => {});
      }

      setStep(7);
      setTimeout(() => {
        router.push(`/dashboard/tasks/${taskId}`);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  }

  /* ── Submit (handles auth if needed) ── */
  async function handleSubmit() {
    if (!name.trim() || !prompt.trim() || !finalSchedule.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (notifyEmail && !notifyEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (isAuthenticated) {
      await doCreateTask();
    } else {
      // Validate auth fields
      if (!authEmail.includes("@") || authPassword.length < 8) {
        setError("Please enter a valid email and password (min 8 characters).");
        setIsSubmitting(false);
        return;
      }

      // Save task to sessionStorage so it survives the auth redirect
      sessionStorage.setItem("subconscious:pending-task", JSON.stringify({
        name: name.trim(),
        prompt: prompt.trim(),
        schedule: finalSchedule.trim(),
        engine: DEFAULT_ENGINE,
        tools: DEFAULT_TOOLS,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifyEmail: notifyEmail.trim() || authEmail.trim(),
        notifyOnSuccess: true,
        notifyOnFailure: true,
      }));

      try {
        const formData = new FormData();
        formData.set("email", authEmail);
        formData.set("password", authPassword);
        formData.set("flow", authFlow);

        const tryAuth = (fd: FormData) =>
          Promise.race([
            signIn("password", fd),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("timed out")), 15000),
            ),
          ]);

        let result = await tryAuth(formData);

        // If sign-up failed because account exists, retry as sign-in
        if (!result.signingIn && authFlow === "signUp") {
          const retryData = new FormData();
          retryData.set("email", authEmail);
          retryData.set("password", authPassword);
          retryData.set("flow", "signIn");
          result = await tryAuth(retryData);
        }

        if (result.signingIn) {
          // Auth succeeded — redirect will pick up the pending task from sessionStorage
          return;
        } else {
          sessionStorage.removeItem("subconscious:pending-task");
          setError("Authentication failed. Please try again.");
          setIsSubmitting(false);
        }
      } catch (err) {
        // If sign-up threw because account exists, retry as sign-in
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        if (authFlow === "signUp" && (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("unique"))) {
          try {
            const retryData = new FormData();
            retryData.set("email", authEmail);
            retryData.set("password", authPassword);
            retryData.set("flow", "signIn");
            const retryResult = await Promise.race([
              signIn("password", retryData),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("timed out")), 15000),
              ),
            ]);
            if (retryResult.signingIn) {
              // Auth succeeded — redirect will pick up the pending task
              return;
            }
          } catch { /* fall through to original error */ }
        }
        sessionStorage.removeItem("subconscious:pending-task");
        setError(getAuthError(err, authFlow));
        setIsSubmitting(false);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════ */
  /* ═══ RENDER                                         ═══ */
  /* ═══════════════════════════════════════════════════════ */

  /* ─── Step 7: Success ─── */
  if (step === 7) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center onboarding-fade-in">
          {/* Confetti burst */}
          <div className="relative mx-auto mb-6 h-24 w-24">
            <div className="confetti-burst" />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-success/10 onboarding-success-pop">
              <Check className="h-12 w-12 text-success" strokeWidth={2} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-cream">You&apos;re all set!</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
            <strong className="text-cream">{name}</strong> will run {scheduleLabel.toLowerCase()}.
            <br />
            Taking you to your task now...
          </p>
          <div className="mt-6 flex justify-center">
            <div className="h-1 w-40 overflow-hidden rounded-full bg-edge">
              <div className="h-full bg-brand onboarding-progress-fill" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Step 0: Welcome ─── */
  if (step === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 onboarding-fade-in">
            <Rocket className="h-10 w-10 text-brand" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-cream onboarding-fade-in">
            Set up your first personalized email
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base text-muted onboarding-fade-in-delayed">
            Pick a template, customize it, set a schedule, and get tailored emails delivered to your inbox. Takes about 60 seconds.
          </p>
          <button
            onClick={() => setStep(2)}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-3.5 text-sm font-semibold text-ink transition-all hover:bg-brand-light hover:scale-105 active:scale-100 onboarding-fade-in-delayed cursor-pointer"
          >
            Let&apos;s go
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  /* ─── Step 2: Pick template ─── */
  if (step === 2) {
    return (
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center onboarding-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-2">Step 1 of 4</p>
            <h2 className="text-2xl font-bold text-cream">Pick a starting point</h2>
            <p className="mt-2 text-sm text-muted">
              Choose a template and we&apos;ll pre-fill everything. You can customize it all in the next steps.
            </p>
          </div>

          <div className="grid gap-3 onboarding-fade-in-delayed">
            {TEMPLATES.map((t, i) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className="group relative flex items-center gap-4 rounded-xl border border-edge/60 bg-surface/60 p-5 text-left transition-all hover:border-brand/40 hover:bg-surface cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.bg} transition-transform group-hover:scale-110`}>
                  <span className={t.color}>{t.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-cream">{t.label}</h3>
                  <p className="mt-1 text-sm text-muted">{t.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-edge transition-all group-hover:text-brand group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Steps 3-6: Guided build ─── */

  const totalBuildSteps = 4;
  const buildStep = step - 2; // 1-4
  const progressPercent = (buildStep / totalBuildSteps) * 100;

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Progress header */}
        <div className="mb-6 onboarding-fade-in">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                setError(null);
                if (step === 3) setStep(2);
                else setStep(step - 1);
              }}
              className="text-xs text-muted hover:text-cream transition-colors cursor-pointer"
            >
              &larr; Back
            </button>
            <span className="text-xs text-muted">
              Step {buildStep} of {totalBuildSteps}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-edge overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger onboarding-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {error}
          </div>
        )}

        {/* ── Step 3: Name ── */}
        {step === 3 && (
          <div className="onboarding-fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-cream">Name your task</h2>
              <p className="mt-1 text-sm text-muted">Give your email a descriptive name.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="onboard-name" className="mb-1.5 block text-sm font-medium text-cream">
                  Task name
                </label>
                <input
                  ref={nameRef}
                  id="onboard-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setTypewriterEnabled(false);
                    setName(e.target.value);
                  }}
                  placeholder="e.g. Morning News Brief"
                  maxLength={100}
                  className="w-full rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1.5 text-xs text-muted">{name.length}/100</p>
              </div>
            </div>

            {/* Next */}
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => { setError(null); if (name.trim()) setStep(4); else setError("Give your task a name first."); }}
                disabled={!name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-ink transition-all hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-100 cursor-pointer"
              >
                Next: Write instructions
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Prompt with typewriter ── */}
        {step === 4 && (
          <div className="onboarding-fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-cream">What should your email include?</h2>
              <p className="mt-1 text-sm text-muted">
                {typewriterEnabled
                  ? "Watch — we're writing your instructions from the template. Edit anything you like."
                  : "Describe the content you want in each email."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Typewriter status */}
              {typewriterEnabled && !typewriterDone && (
                <div className="flex items-center gap-2 rounded-lg bg-brand/5 border border-brand/20 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                  <span className="text-xs text-brand font-medium">Writing from template...</span>
                  <button
                    onClick={() => { setTypewriterEnabled(false); setPrompt(templatePrompt); }}
                    className="ml-auto text-[10px] text-muted hover:text-cream transition-colors cursor-pointer"
                  >
                    Skip animation
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="onboard-prompt" className="mb-1.5 block text-sm font-medium text-cream">
                  Email content instructions
                </label>
                <textarea
                  ref={promptRef}
                  id="onboard-prompt"
                  value={prompt}
                  onChange={(e) => {
                    setTypewriterEnabled(false);
                    setPrompt(e.target.value);
                  }}
                  placeholder="e.g. Search for the latest news about AI and summarize the top 5 stories..."
                  rows={6}
                  maxLength={5000}
                  className="w-full rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                />
                <p className="mt-1.5 text-xs text-muted">{prompt.length}/5,000</p>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Tips</p>
                {[
                  "Be specific about what content you want in each email",
                  "Mention the format you prefer (bullet points, paragraphs, etc.)",
                  "Include any sources or topics to focus on",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-brand/50" strokeWidth={1.5} />
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => { setError(null); if (prompt.trim()) setStep(5); else setError("Write some instructions first."); }}
                disabled={!prompt.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-ink transition-all hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-100 cursor-pointer"
              >
                Next: Set schedule
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Schedule ── */}
        {step === 5 && (
          <div className="onboarding-fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-cream">When should it run?</h2>
              <p className="mt-1 text-sm text-muted">
                Pick a delivery schedule. Your email arrives automatically — no need to remember.
              </p>
            </div>

            <div className="space-y-5">
              <ScheduleBuilder
                frequency={frequency} setFrequency={setFrequency}
                hour12={hour12} setHour12={setHour12}
                minute={minute} setMinute={setMinute}
                ampm={ampm} setAmpm={setAmpm}
                weekDays={weekDays} setWeekDays={setWeekDays}
                showCustomCron={showCustomCron} setShowCustomCron={setShowCustomCron}
                customCron={customCron} setCustomCron={setCustomCron}
              />

              {/* Next run preview */}
              <div className="flex items-center gap-3 rounded-lg bg-brand/5 border border-brand/20 px-4 py-3">
                <Clock className="h-5 w-5 text-brand shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs font-medium text-cream">Your email will be delivered</p>
                  <p className="text-sm font-semibold text-brand">{scheduleLabel}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => { setError(null); setStep(6); }}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-ink transition-all hover:bg-brand-light hover:scale-105 active:scale-100 cursor-pointer"
              >
                Next: Review &amp; launch
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Review + Auth + Launch ── */}
        {step === 6 && (
          <div className="onboarding-fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-cream">
                {isAuthenticated ? "Review & launch" : "Almost there!"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isAuthenticated
                  ? "Everything looks good? Hit launch and your emails start delivering."
                  : "Create an account (or sign in) to start receiving your emails."}
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 mb-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted shrink-0 pt-0.5">Name</span>
                  <span className="text-sm font-semibold text-cream text-right">{name}</span>
                </div>
                <div className="border-t border-edge/30" />
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted shrink-0 pt-0.5">Instructions</span>
                  <span className="text-xs text-subtle text-right max-w-sm line-clamp-3">{prompt}</span>
                </div>
                <div className="border-t border-edge/30" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Schedule</span>
                  <span className="text-sm font-semibold text-brand">{scheduleLabel}</span>
                </div>
                <div className="border-t border-edge/30" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Status on create</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/10 px-2.5 py-0.5 text-xs font-medium text-lime">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Email notifications (only for authenticated users) */}
            {isAuthenticated && (
              <div className="rounded-xl border border-edge/60 bg-surface/60 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-brand" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-cream">Email notifications</p>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-ink text-muted border border-edge">
                    Optional
                  </span>
                </div>
                <input
                  id="onboard-email"
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-edge bg-ink px-4 py-2.5 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                {notifyEmail.trim() && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 onboarding-fade-in">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyOnSuccess}
                        onChange={(e) => setNotifyOnSuccess(e.target.checked)}
                        className="h-4 w-4 rounded border-edge bg-ink accent-brand"
                      />
                      <span className="text-xs text-cream">On success</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyOnFailure}
                        onChange={(e) => setNotifyOnFailure(e.target.checked)}
                        className="h-4 w-4 rounded border-edge bg-ink accent-brand"
                      />
                      <span className="text-xs text-cream">On failure</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Sign-in form for unauthenticated users */}
            {!isAuthenticated && (
              <div className="rounded-xl border border-edge/60 bg-surface/60 p-5 mb-6">
                {/* Flow toggle */}
                <div className="mb-4 flex rounded-full bg-ink p-1">
                  <button
                    type="button"
                    onClick={() => { setAuthFlow("signUp"); setError(null); }}
                    className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all cursor-pointer ${
                      authFlow === "signUp"
                        ? "bg-surface text-cream shadow-sm"
                        : "text-muted hover:text-subtle"
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthFlow("signIn"); setError(null); }}
                    className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all cursor-pointer ${
                      authFlow === "signIn"
                        ? "bg-surface text-cream shadow-sm"
                        : "text-muted hover:text-subtle"
                    }`}
                  >
                    Sign In
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="onboard-auth-email" className="mb-1.5 block text-xs font-medium text-subtle">
                      Email
                    </label>
                    <input
                      id="onboard-auth-email"
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label htmlFor="onboard-auth-password" className="mb-1.5 block text-xs font-medium text-subtle">
                      Password
                    </label>
                    <input
                      id="onboard-auth-password"
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      autoComplete={authFlow === "signIn" ? "current-password" : "new-password"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && authEmail.includes("@") && authPassword.length >= 8) handleSubmit();
                      }}
                      className="w-full rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Launch */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (!isAuthenticated && (!authEmail.includes("@") || authPassword.length < 8))}
                className="inline-flex items-center gap-2.5 rounded-xl bg-brand px-10 py-3.5 text-base font-semibold text-ink transition-all hover:bg-brand-light hover:scale-105 active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-brand/20"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5" strokeWidth={2} />
                    {isAuthenticated
                      ? "Start Delivering"
                      : authFlow === "signUp"
                        ? "Create Account & Start"
                        : "Sign In & Start"}
                  </>
                )}
              </button>
            </div>
            {isAuthenticated && !notifyEmail.trim() && (
              <p className="mt-3 text-center text-xs text-muted/60">
                No email? No problem — check results in the dashboard anytime
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
