import type { Doc } from "../../convex/_generated/dataModel";

type Result = Doc<"executionResults">;

function formatDateTime(timestamp: number | undefined | null): string {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleString("en-US", {
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
    const allEmpty = entries.length > 0 && entries.every(([, v]) => v === "" || v === null || v === undefined);
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

export default function ResultDetail({ result }: { result: Result }) {
  const outputText = extractResultText(result.result);

  return (
    <div className="space-y-4">
      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-medium text-muted">Started</dt>
          <dd className="mt-0.5 text-sm text-subtle">{formatDateTime(result.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Completed</dt>
          <dd className="mt-0.5 text-sm text-subtle">{formatDateTime(result.completedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Duration</dt>
          <dd className="mt-0.5 text-sm text-subtle tabular-nums">{formatDuration(result.durationMs)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted">Run ID</dt>
          <dd className="mt-0.5 font-mono text-xs text-subtle break-all">{result.runId || "--"}</dd>
        </div>
      </div>

      {/* Usage stats */}
      {result.usage && typeof result.usage === "object" && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium text-muted">Usage</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(result.usage as Record<string, unknown>).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-2 py-1 text-xs"
              >
                <span className="text-muted">{key}:</span>
                <span className="tabular-nums text-subtle">{String(value)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {result.error && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium text-danger">Error</h4>
          <pre className="overflow-x-auto rounded-md border border-danger/20 bg-danger/5 p-3 font-mono text-xs text-danger whitespace-pre-wrap">
            {result.error}
          </pre>
        </div>
      )}

      {/* Output */}
      {outputText && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium text-muted">Output</h4>
          <pre className="max-h-96 overflow-auto rounded-md border border-edge bg-ink p-3 font-mono text-xs text-cream/90 whitespace-pre-wrap">
            {outputText}
          </pre>
        </div>
      )}

      {/* Empty state */}
      {!outputText && !result.error && (
        <p className="text-xs text-muted">No output available for this run.</p>
      )}
    </div>
  );
}
