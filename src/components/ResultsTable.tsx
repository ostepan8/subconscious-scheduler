"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ChevronDown } from "lucide-react";
import RunStatusBadge from "@/components/RunStatusBadge";
import ResultDetail from "@/components/ResultDetail";
import type { Doc } from "../../convex/_generated/dataModel";

type Result = Doc<"executionResults">;

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | undefined | null): string {
  if (ms === null || ms === undefined) return "--";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function ResultsTable({ results }: { results: Result[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface/80 p-8 text-center">
        <p className="text-sm text-muted">No execution results yet.</p>
        <p className="mt-1 text-xs text-muted">
          Results will appear here after the task runs.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-edge">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-edge bg-surface">
            <th className="px-4 py-3 text-xs font-medium text-muted">Status</th>
            <th className="px-4 py-3 text-xs font-medium text-muted">Started</th>
            <th className="px-4 py-3 text-xs font-medium text-muted">Duration</th>
            <th className="px-4 py-3 text-xs font-medium text-muted">Run ID</th>
            <th className="px-4 py-3 text-xs font-medium text-muted" />
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <ResultRow
              key={result._id}
              result={result}
              isExpanded={expandedId === result._id}
              onToggle={() =>
                setExpandedId(expandedId === result._id ? null : result._id)
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultRow({
  result,
  isExpanded,
  onToggle,
}: {
  result: Result;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-edge transition-colors hover:bg-surface-hover ${
          isExpanded ? "bg-surface" : "bg-ink"
        }`}
      >
        <td className="px-4 py-3">
          <RunStatusBadge status={result.status} />
        </td>
        <td className="px-4 py-3 text-subtle">{formatTime(result.startedAt)}</td>
        <td className="px-4 py-3 text-subtle tabular-nums">
          {formatDuration(result.durationMs)}
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-muted">
            {result.runId ? result.runId.slice(0, 12) : "--"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/dashboard/tasks/${result.taskId}/executions/${result._id}`}
              className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-cream"
              title="View full output"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <button
              onClick={onToggle}
              className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-cream"
              title="Toggle preview"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                strokeWidth={1.75}
              />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="border-b border-edge bg-surface px-4 py-4">
            <ResultDetail result={result} />
          </td>
        </tr>
      )}
    </>
  );
}
