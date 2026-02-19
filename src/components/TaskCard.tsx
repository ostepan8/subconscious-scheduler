import Link from "next/link";
import { Clock, Play, AlertTriangle } from "lucide-react";
import { formatSchedule } from "@/lib/schedule";
import TaskStatusBadge from "@/components/TaskStatusBadge";
import type { Doc } from "../../convex/_generated/dataModel";

function formatRelativeTime(timestamp: number | undefined | null): string {
  if (!timestamp) return "Never";
  const now = Date.now();
  const diffMs = now - timestamp;

  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs);
    if (absDiff < 60_000) return "in <1m";
    if (absDiff < 3_600_000) return `in ${Math.floor(absDiff / 60_000)}m`;
    if (absDiff < 86_400_000) return `in ${Math.floor(absDiff / 3_600_000)}h`;
    return `in ${Math.floor(absDiff / 86_400_000)}d`;
  }

  if (diffMs < 60_000) return "<1m ago";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

export default function TaskCard({ task }: { task: Doc<"tasks"> }) {
  return (
    <Link
      href={`/dashboard/tasks/${task._id}`}
      className="group block rounded-xl border border-edge/60 bg-surface/80 p-4 backdrop-blur-sm transition-all hover:bg-surface-hover hover:border-edge-light"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-cream group-hover:text-brand-light transition-colors">
            {task.name}
          </h3>
          <p className="mt-1 truncate text-xs text-muted">{task.prompt}</p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-subtle">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted" strokeWidth={1.75} />
          {formatSchedule(task.schedule)}
        </span>

        <span className="flex items-center gap-1">
          <Play className="h-3 w-3 text-muted" strokeWidth={1.75} />
          {formatRelativeTime(task.lastRunAt)}
        </span>

        {task.nextRunAt && (
          <span className="text-muted">
            Next: {formatRelativeTime(task.nextRunAt)}
          </span>
        )}

        {task.activeRunId && (
          <span className="flex items-center gap-1 text-brand">
            <div className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            Running
          </span>
        )}

        {task.lastRunStatus === "failed" && !task.activeRunId && (
          <span className="flex items-center gap-1 text-danger">
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            Last run failed{task.consecutiveFailures > 1 ? ` (${task.consecutiveFailures}x)` : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
