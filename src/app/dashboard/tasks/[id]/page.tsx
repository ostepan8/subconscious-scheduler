"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { formatSchedule } from "@/lib/schedule";
import TaskStatusBadge from "@/components/TaskStatusBadge";
import TriggerButton from "@/components/TriggerButton";
import EditTaskDialog from "@/components/EditTaskDialog";
import ResultsTable from "@/components/ResultsTable";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TaskDetailPage() {
  const params = useParams();
  const id = params.id as Id<"tasks">;

  const task = useQuery(api.tasks.get, { id });
  const results = useQuery(api.executionResults.listByTask, { taskId: id });

  if (task === undefined || results === undefined) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              Back to Dashboard
            </Link>
          </div>

          {/* Header skeleton */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-7 w-48 animate-pulse rounded-lg bg-surface" />
                <div className="h-5 w-14 animate-pulse rounded-full bg-surface/60" />
              </div>
              <div className="mt-2 h-4 w-56 animate-pulse rounded bg-surface/60" />
            </div>
            <div className="h-9 w-24 animate-pulse rounded-lg bg-surface" />
          </div>

          {/* Prompt skeleton */}
          <div className="mb-8 rounded-xl border border-edge/60 bg-surface/60 p-5">
            <div className="mb-3 h-4 w-12 animate-pulse rounded bg-surface" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-surface/60" />
            </div>
          </div>

          {/* Edit skeleton */}
          <div className="mb-8">
            <div className="h-9 w-20 animate-pulse rounded-lg bg-surface" />
          </div>

          {/* Results table skeleton */}
          <div>
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-surface" />
            <div className="overflow-hidden rounded-xl border border-edge">
              <div className="flex border-b border-edge bg-surface px-4 py-3 gap-4">
                <div className="h-3 w-14 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface/60" />
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center border-b border-edge px-4 py-3.5 gap-4">
                  <div className="h-5 w-18 animate-pulse rounded-full bg-surface/60" />
                  <div className="h-3 w-28 animate-pulse rounded bg-surface/60" />
                  <div className="h-3 w-14 animate-pulse rounded bg-surface/60" />
                  <div className="h-3 w-20 animate-pulse rounded bg-surface/60" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (task === null) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-2xl font-bold text-cream">Task Not Found</h1>
          <p className="mt-2 text-sm text-muted">This task may have been deleted.</p>
          <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-light">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-cream">{task.name}</h1>
              <TaskStatusBadge status={task.status} />
              {task.activeRunId && (
                <span className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  Running
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">{formatSchedule(task.schedule)} &middot; {task.engine}</p>
          </div>
          <TriggerButton taskId={task._id} isRunning={!!task.activeRunId} />
        </div>

        {/* Prompt */}
        <div className="mb-8 rounded-xl border border-edge/60 bg-surface/80 p-5 backdrop-blur-sm">
          <h2 className="mb-2 text-sm font-medium text-subtle">Prompt</h2>
          <p className="whitespace-pre-wrap text-sm text-cream">{task.prompt}</p>
        </div>

        {/* Edit */}
        <div className="mb-8">
          <EditTaskDialog task={task} />
        </div>

        {/* Results */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-cream">Execution History</h2>
          <ResultsTable results={results} />
        </div>
      </div>
    </div>
  );
}
