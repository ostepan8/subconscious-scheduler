"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import TaskCard from "@/components/TaskCard";
import EmptyState from "@/components/EmptyState";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { Activity, AlertTriangle, Zap, Rocket } from "lucide-react";

const PENDING_KEY = "subconscious:pending-task";

export default function TasksPage() {
  const tasks = useQuery(api.tasks.list);
  const stats = useQuery(api.tasks.stats);
  const createTask = useMutation(api.tasks.create);
  const upsertNotifs = useMutation(api.notificationPrefs.upsert);
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const pendingHandled = useRef(false);
  const [creatingPending, setCreatingPending] = useState(
    () => typeof window !== "undefined" && !!sessionStorage.getItem(PENDING_KEY)
  );

  // Pick up any pending task from onboarding (saved before auth redirect)
  // Wait until authenticated so the Convex mutation has a valid auth token
  useEffect(() => {
    if (pendingHandled.current || !isAuthenticated) return;
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) {
      setCreatingPending(false);
      return;
    }
    pendingHandled.current = true;
    sessionStorage.removeItem(PENDING_KEY);
    setCreatingPending(true);

    const data = JSON.parse(raw);

    async function create(retries = 3): Promise<void> {
      try {
        const taskId = await createTask({
          name: data.name,
          prompt: data.prompt,
          schedule: data.schedule,
          engine: data.engine,
          tools: data.tools,
          timezone: data.timezone,
        });

        if (data.notifyEmail) {
          await upsertNotifs({
            taskId,
            enabled: true,
            channels: [{
              channel: "resend" as const,
              to: data.notifyEmail,
              onSuccess: data.notifyOnSuccess,
              onFailure: data.notifyOnFailure,
              includeResult: true,
              customBody: "{{...agentResponse}}",
            }],
          }).catch(() => {});
        }

        setCreatingPending(false);
        router.push(`/dashboard/tasks/${taskId}`);
      } catch {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 1000));
          return create(retries - 1);
        }
        setCreatingPending(false);
      }
    }

    create();
  }, [createTask, upsertNotifs, router, isAuthenticated]);

  const isLoading = tasks === undefined;

  if (creatingPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center onboarding-fade-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
            <Rocket className="h-7 w-7 text-brand animate-pulse" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-cream">Setting up your email...</h2>
          <p className="mt-2 text-sm text-muted">Setting everything up. Just a moment.</p>
          <div className="mt-5 flex justify-center">
            <div className="h-1 w-32 overflow-hidden rounded-full bg-edge">
              <div className="h-full bg-brand onboarding-progress-fill" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div data-tour="tasks-area" className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cream">Your Tasks</h1>
            <p className="mt-1 text-sm text-muted">
              Manage your scheduled emails
            </p>
          </div>
          <CreateTaskDialog />
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="flex items-center gap-3 rounded-xl border border-edge/60 bg-surface/60 px-4 py-3">
              <Activity className="h-4 w-4 text-lime" strokeWidth={1.75} />
              <div>
                <p className="text-lg font-semibold text-cream">{stats.active}</p>
                <p className="text-[11px] text-muted">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-edge/60 bg-surface/60 px-4 py-3">
              <Zap className="h-4 w-4 text-brand" strokeWidth={1.75} />
              <div>
                <p className="text-lg font-semibold text-cream">{stats.running}</p>
                <p className="text-[11px] text-muted">Running</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-edge/60 bg-surface/60 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-danger" strokeWidth={1.75} />
              <div>
                <p className="text-lg font-semibold text-cream">{stats.errored}</p>
                <p className="text-[11px] text-muted">Errored</p>
              </div>
            </div>
          </div>
        )}

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-edge/60 bg-surface/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="h-4 w-40 animate-pulse rounded bg-surface-hover" />
                    <div className="mt-2 h-3 w-64 animate-pulse rounded bg-surface-hover/60" />
                  </div>
                  <div className="h-5 w-14 animate-pulse rounded-full bg-surface-hover" />
                </div>
                <div className="mt-3 flex gap-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-surface-hover/40" />
                  <div className="h-3 w-16 animate-pulse rounded bg-surface-hover/40" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
