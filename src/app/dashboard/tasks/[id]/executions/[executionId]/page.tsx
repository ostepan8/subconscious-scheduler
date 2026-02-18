"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import RunStatusBadge from "@/components/RunStatusBadge";
import Link from "next/link";
import { AlertTriangle, Copy, ClipboardCopy } from "lucide-react";

function formatDateTime(timestamp: number | undefined | null): string {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
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

function extractResultText(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") return result || null;
  if (typeof result === "object") {
    const entries = Object.entries(result as Record<string, unknown>);
    const allEmpty =
      entries.length > 0 &&
      entries.every(([, v]) => v === "" || v === null || v === undefined);
    if (allEmpty) return null;

    const r = result as Record<string, unknown>;
    if ("output" in r && typeof r.output === "string" && r.output) {
      return r.output;
    }
    if ("answer" in r && typeof r.answer === "string" && r.answer) {
      return r.answer;
    }
  }
  return JSON.stringify(result, null, 2);
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const executionId = params.executionId as Id<"executionResults">;

  const result = useQuery(api.executionResults.getById, { id: executionId });
  const task = useQuery(api.tasks.get, { id: taskId as Id<"tasks"> });

  if (result === undefined || task === undefined) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb skeleton */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
            <Link href="/dashboard" className="hover:text-cream transition-colors">Dashboard</Link>
            <span>/</span>
            <div className="h-3.5 w-20 animate-pulse rounded bg-surface" />
            <span>/</span>
            <span className="text-subtle">Execution</span>
          </nav>

          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="h-7 w-44 animate-pulse rounded-lg bg-surface" />
              <div className="h-5 w-18 animate-pulse rounded-full bg-surface/60" />
            </div>
            <div className="mt-2 h-4 w-32 animate-pulse rounded bg-surface/60" />
          </div>

          {/* Metadata card skeleton */}
          <div className="mb-6 rounded-xl border border-edge bg-surface/60 p-5">
            <div className="mb-3 h-4 w-14 animate-pulse rounded bg-surface" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-14 animate-pulse rounded bg-surface/60" />
                  <div className="mt-2 h-4 w-24 animate-pulse rounded bg-surface" />
                </div>
              ))}
            </div>
          </div>

          {/* Output skeleton */}
          <div className="mb-6 rounded-xl border border-edge bg-surface/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-14 animate-pulse rounded bg-surface" />
              <div className="h-6 w-16 animate-pulse rounded-md bg-surface/60" />
            </div>
            <div className="rounded-lg border border-edge bg-ink p-4">
              <div className="space-y-2.5">
                <div className="h-3 w-full animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-full animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-surface/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-2xl font-bold text-cream">
            Execution Not Found
          </h1>
          <p className="mt-2 text-sm text-muted">
            This execution result may have been removed.
          </p>
          <Link
            href={`/dashboard/tasks/${taskId}`}
            className="mt-4 inline-block text-sm text-brand hover:text-brand-light"
          >
            &larr; Back to Task
          </Link>
        </div>
      </div>
    );
  }

  const outputText = extractResultText(result.result);
  const rawResult = result.result;
  const hasStructuredData =
    rawResult &&
    typeof rawResult === "object" &&
    !Array.isArray(rawResult) &&
    Object.keys(rawResult as Record<string, unknown>).length > 0;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
          <Link href="/dashboard" className="hover:text-cream transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href={`/dashboard/tasks/${taskId}`} className="hover:text-cream transition-colors">{task?.name ?? "Task"}</Link>
          <span>/</span>
          <span className="text-subtle">Execution</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-cream">Execution Detail</h1>
            <RunStatusBadge status={result.status} />
          </div>
          <p className="mt-1.5 font-mono text-sm text-muted">
            {result.runId || "No run ID"}
          </p>
        </div>

        {/* Metadata card */}
        <div className="mb-6 rounded-xl border border-edge bg-surface/80 p-5">
          <h2 className="mb-3 text-sm font-medium text-subtle">Details</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-muted">Status</dt>
              <dd className="mt-1"><RunStatusBadge status={result.status} /></dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Started</dt>
              <dd className="mt-1 text-sm text-cream">{formatDateTime(result.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Completed</dt>
              <dd className="mt-1 text-sm text-cream">{formatDateTime(result.completedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Duration</dt>
              <dd className="mt-1 text-sm tabular-nums text-cream">{formatDuration(result.durationMs)}</dd>
            </div>
          </div>
        </div>

        {/* Usage stats */}
        {result.usage && typeof result.usage === "object" && (
          <div className="mb-6 rounded-xl border border-edge bg-surface/80 p-5">
            <h2 className="mb-3 text-sm font-medium text-subtle">Usage</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(result.usage as Record<string, unknown>).map(
                ([key, value]) => (
                  <div key={key} className="rounded-lg border border-edge bg-ink px-3 py-2">
                    <dt className="text-xs text-muted">{key}</dt>
                    <dd className="mt-0.5 text-sm tabular-nums text-cream">{String(value)}</dd>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {result.error && (
          <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-danger">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
              Error
            </h2>
            <pre className="overflow-x-auto font-mono text-sm text-danger/90 whitespace-pre-wrap leading-relaxed">
              {result.error}
            </pre>
          </div>
        )}

        {/* Output */}
        {outputText && (
          <div className="mb-6 rounded-xl border border-edge bg-surface/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-subtle">Output</h2>
              <button
                onClick={() => navigator.clipboard.writeText(outputText)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-cream"
              >
                <Copy className="h-3 w-3" strokeWidth={1.75} />
                Copy
              </button>
            </div>
            <pre className="overflow-auto rounded-lg border border-edge bg-ink p-4 font-mono text-sm text-cream/90 whitespace-pre-wrap leading-relaxed">
              {outputText}
            </pre>
          </div>
        )}

        {/* Raw JSON */}
        {hasStructuredData && (
          <div className="mb-6 rounded-xl border border-edge bg-surface/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-subtle">Raw Result</h2>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(rawResult, null, 2))}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-cream"
              >
                <ClipboardCopy className="h-3 w-3" strokeWidth={1.75} />
                Copy JSON
              </button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg border border-edge bg-ink p-4 font-mono text-xs text-cream/70 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(rawResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Empty state */}
        {!outputText && !result.error && result.status !== "running" && result.status !== "queued" && (
          <div className="rounded-xl border border-edge bg-surface/80 p-8 text-center">
            <p className="text-sm text-muted">No output was produced by this execution.</p>
          </div>
        )}

        {/* Running state */}
        {(result.status === "running" || result.status === "queued") && !outputText && (
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-8 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm text-brand">
              {result.status === "running"
                ? "This execution is currently running..."
                : "This execution is queued and will start soon..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
