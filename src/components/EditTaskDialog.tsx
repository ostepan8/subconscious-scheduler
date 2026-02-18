"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ENGINE_OPTIONS as SHARED_ENGINE_OPTIONS } from "@/lib/constants";
import { Pencil, X, Bell, Trash2, Mail, Plus } from "lucide-react";

type TaskType = "research" | "sync" | "digest";
type TaskStatus = "active" | "paused" | "error";

interface ResendConfig { channel: "resend"; to: string; onSuccess: boolean; onFailure: boolean; customSubject?: string; customBody?: string; includeResult?: boolean; }
type ChannelConfig = ResendConfig;

interface NotificationPreferences { enabled: boolean; channels: ChannelConfig[]; }

const SCHEDULE_PRESETS = [
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Weekly (Monday 9am)", value: "0 9 * * 1" },
  { label: "Custom...", value: "__custom__" },
];

const TASK_TYPES: { label: string; value: TaskType }[] = [
  { label: "Research", value: "research" },
  { label: "Sync", value: "sync" },
  { label: "Digest", value: "digest" },
];

const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
];

const ENGINE_OPTIONS = SHARED_ENGINE_OPTIONS.map((e) => ({
  label: e.label,
  value: e.value,
}));


function resolvePreset(schedule: string): string {
  const match = SCHEDULE_PRESETS.find((p) => p.value === schedule);
  return match ? schedule : "__custom__";
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${enabled ? "bg-lime" : "bg-edge"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
    </button>
  );
}

function NotificationSettings({ taskId, isOpen }: { taskId: Id<"tasks">; isOpen: boolean }) {
  const storedPrefs = useQuery(api.notificationPrefs.getByTask, isOpen ? { taskId } : "skip");
  const upsertPrefs = useMutation(api.notificationPrefs.upsert);
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const prefs: NotificationPreferences = localPrefs ?? (storedPrefs ? { enabled: storedPrefs.enabled, channels: (storedPrefs.channels ?? []) as ChannelConfig[] } : { enabled: false, channels: [] });

  function updatePrefs(updated: NotificationPreferences) { setLocalPrefs(updated); }

  async function savePrefs(updated: NotificationPreferences) {
    setLocalPrefs(updated); setSaving(true); setNotifyError(null); setNotifySuccess(false);
    try {
      await upsertPrefs({ taskId, enabled: updated.enabled, channels: updated.channels });
      setNotifySuccess(true); setTimeout(() => setNotifySuccess(false), 2000);
    } catch (err) { setNotifyError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  function addChannel() {
    if (prefs.channels.some((c) => c.channel === "resend")) return;
    const newChannel: ChannelConfig = { channel: "resend", to: "", onSuccess: true, onFailure: true };
    updatePrefs({ ...prefs, enabled: true, channels: [...prefs.channels, newChannel] });
  }

  function removeChannel(index: number) { savePrefs({ ...prefs, channels: prefs.channels.filter((_, i) => i !== index) }); }

  function updateChannel(index: number, updates: Partial<ChannelConfig>) {
    const channels = prefs.channels.map((ch, i) => i !== index ? ch : { ...ch, ...updates } as ChannelConfig);
    updatePrefs({ ...prefs, channels });
  }

  function handleSave() {
    for (const ch of prefs.channels) {
      if (ch.channel === "resend" && !ch.to.trim()) { setNotifyError("Email address is required."); return; }
    }
    savePrefs(prefs);
  }

  const hasEmail = prefs.channels.some((c) => c.channel === "resend");

  if (storedPrefs === undefined) {
    return (<div className="flex items-center gap-2 py-3 text-xs text-muted"><div className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-transparent" />Loading notifications...</div>);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-subtle">Send email notifications</span>
        <Toggle enabled={prefs.enabled} onChange={(v) => savePrefs({ ...prefs, enabled: v })} />
      </div>

      {prefs.enabled && (
        <div className="space-y-3">
          {hasEmail ? (
            <div className="rounded-lg border border-edge bg-ink p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-cream">
                  <Mail className="h-4 w-4 text-muted" strokeWidth={1.5} />Email
                </div>
                <button type="button" onClick={() => removeChannel(0)} className="rounded p-0.5 text-muted transition-colors hover:text-danger">
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
              <input type="email" value={prefs.channels[0]?.to ?? ""} onChange={(e) => updateChannel(0, { to: e.target.value })} placeholder="you@example.com" className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-sm text-cream placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={prefs.channels[0]?.onSuccess !== false} onChange={(e) => updateChannel(0, { onSuccess: e.target.checked })} className="h-3.5 w-3.5 rounded border-edge bg-surface text-brand accent-brand" /><span className="text-xs text-subtle">On success</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={prefs.channels[0]?.onFailure !== false} onChange={(e) => updateChannel(0, { onFailure: e.target.checked })} className="h-3.5 w-3.5 rounded border-edge bg-surface text-brand accent-brand" /><span className="text-xs text-subtle">On failure</span></label>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => addChannel()} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-light transition-colors">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />Add email
            </button>
          )}

          {hasEmail && (
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-brand-light disabled:opacity-50">
                {saving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-ink border-t-transparent" />}
                {saving ? "Saving..." : "Save Notifications"}
              </button>
              {notifySuccess && <span className="text-xs text-lime">Saved</span>}
            </div>
          )}
          {notifyError && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">{notifyError}</div>}
        </div>
      )}
    </div>
  );
}

export default function EditTaskDialog({ task }: { task: Doc<"tasks"> }) {
  const router = useRouter();
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(task.name);
  const [type, setType] = useState<TaskType>(task.type as TaskType);
  const [prompt, setPrompt] = useState(task.prompt);
  const [status, setStatus] = useState<TaskStatus>(task.status === "error" ? "paused" : task.status as TaskStatus);
  const [schedulePreset, setSchedulePreset] = useState(resolvePreset(task.schedule));
  const [customSchedule, setCustomSchedule] = useState(resolvePreset(task.schedule) === "__custom__" ? task.schedule : "");
  const [engine, setEngine] = useState(task.engine);

  const schedule = schedulePreset === "__custom__" ? customSchedule : schedulePreset;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !prompt.trim() || !schedule.trim()) { setError("Name, prompt, and schedule are required."); return; }
    setIsSubmitting(true); setError(null);
    try {
      await updateTask({ id: task._id, name: name.trim(), type, prompt: prompt.trim(), schedule: schedule.trim(), status, engine });
      setIsOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setIsSubmitting(false); }
  }

  async function handleDelete() {
    setIsDeleting(true); setError(null);
    try { await removeTask({ id: task._id }); router.push("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); setIsDeleting(false); setShowDeleteConfirm(false); }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-edge px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface-hover hover:text-cream">
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />Edit
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cream">Edit Task</h2>
        <button onClick={() => { setIsOpen(false); setShowDeleteConfirm(false); setError(null); }} className="rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-cream">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-edge bg-ink/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand" strokeWidth={1.75} />
            <span className="text-sm font-medium text-cream">Deliver results to</span>
          </div>
          <NotificationSettings taskId={task._id} isOpen={isOpen} />
        </div>

        <div className="border-t border-edge pt-4">
          <label htmlFor="edit-name" className="mb-1 block text-xs font-medium text-subtle">Task Name</label>
          <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="edit-type" className="mb-1 block text-xs font-medium text-subtle">Type</label>
            <select id="edit-type" value={type} onChange={(e) => setType(e.target.value as TaskType)} className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-cream focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
              {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="edit-engine" className="mb-1 block text-xs font-medium text-subtle">Engine</label>
            <select id="edit-engine" value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-cream focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
              {ENGINE_OPTIONS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="edit-status" className="mb-1 block text-xs font-medium text-subtle">Status</label>
            <select id="edit-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-cream focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="edit-prompt" className="mb-1 block text-xs font-medium text-subtle">Prompt</label>
          <textarea id="edit-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none" />
        </div>

        <div>
          <label htmlFor="edit-schedule" className="mb-1 block text-xs font-medium text-subtle">Schedule</label>
          <select id="edit-schedule" value={schedulePreset} onChange={(e) => setSchedulePreset(e.target.value)} className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-cream focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
            {SCHEDULE_PRESETS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {schedulePreset === "__custom__" && (
            <input type="text" value={customSchedule} onChange={(e) => setCustomSchedule(e.target.value)} placeholder="Cron expression, e.g. */30 * * * *" className="mt-2 w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-danger transition-colors hover:bg-danger/10">
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />Delete Task
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger">Are you sure?</span>
                <button type="button" onClick={handleDelete} disabled={isDeleting} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-danger/80 disabled:opacity-50">{isDeleting ? "Deleting..." : "Confirm Delete"}</button>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-md px-2 py-1.5 text-sm text-muted hover:text-cream">Cancel</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setIsOpen(false); setShowDeleteConfirm(false); setError(null); }} className="rounded-md px-4 py-2 text-sm text-subtle transition-colors hover:bg-surface-hover hover:text-cream">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink border-t-transparent" />}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
