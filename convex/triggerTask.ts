import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import cronParser from "cron-parser";

const SUBCONSCIOUS_API = "https://api.subconscious.dev/v1";

function computeNextRunAt(schedule: string, timezone?: string): number | undefined {
  try {
    const options = timezone ? { tz: timezone } : {};
    const interval = cronParser.parseExpression(schedule, options);
    return interval.next().toDate().getTime();
  } catch {
    return undefined;
  }
}

export const trigger = action({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.runQuery(internal.tasks.internalGet, { id });
    if (!task) throw new Error("Task not found");
    if (task.activeRunId) throw new Error("Task is already running");

    const apiKey = process.env.SUBCONSCIOUS_API_KEY;
    if (!apiKey) throw new Error("Missing SUBCONSCIOUS_API_KEY");

    const startedAt = Date.now();

    // Immediately insert a "queued" execution result — shows in UI right away
    const resultId = await ctx.runMutation(internal.executionResults.createPending, {
      taskId: id,
      runId: "",
      status: "queued",
      startedAt,
    });

    // Start the Subconscious run
    const runRes = await fetch(`${SUBCONSCIOUS_API}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        engine: task.engine,
        input: {
          instructions: task.prompt,
          tools: task.tools || [],
        },
      }),
    });

    if (!runRes.ok) {
      const err = await runRes.text();
      // Update the queued record to failed
      await ctx.runMutation(internal.executionResults.updateResult, {
        id: resultId,
        status: "failed",
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        error: `Failed to start run: ${err}`,
      });
      throw new Error(`Failed to start run: ${err}`);
    }

    const run = (await runRes.json()) as { runId: string };

    // Update to "running" with the run ID — UI updates in real time
    await ctx.runMutation(internal.executionResults.updateResult, {
      id: resultId,
      status: "running",
      runId: run.runId,
    });

    // Set active run on task — UI shows "Running..." badge
    await ctx.runMutation(internal.tasks.setActiveRun, {
      id,
      runId: run.runId,
    });

    // Poll for completion
    let completed: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 150; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await fetch(`${SUBCONSCIOUS_API}/runs/${run.runId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!pollRes.ok) continue;

      const pollData = (await pollRes.json()) as Record<string, unknown>;
      if (pollData.status === "running" || pollData.status === "queued") {
        continue;
      }

      completed = pollData;
      break;
    }

    const completedAt = Date.now();
    const durationMs = completedAt - startedAt;

    if (!completed) {
      // Timed out — update the existing record
      await ctx.runMutation(internal.executionResults.updateResult, {
        id: resultId,
        status: "failed",
        completedAt,
        durationMs,
        error: "Run timed out after 5 minutes of polling",
      });
      await ctx.runMutation(internal.tasks.updateAfterRun, {
        id,
        lastRunStatus: "failed",
        consecutiveFailures: (task.consecutiveFailures || 0) + 1,
        status: (task.consecutiveFailures || 0) + 1 >= 5 ? "error" : undefined,
        nextRunAt: computeNextRunAt(task.schedule, task.timezone),
      });
      return { success: false, error: "Timed out" };
    }

    const runStatus = (completed.status as string) ?? "succeeded";
    const isFailed = runStatus === "failed";
    const errorMessage = isFailed ? extractError(completed) : undefined;

    // Update the execution result with final data
    await ctx.runMutation(internal.executionResults.updateResult, {
      id: resultId,
      status: runStatus,
      runId: (completed.runId as string) || run.runId,
      result: completed.result ?? undefined,
      usage: completed.usage ?? undefined,
      completedAt,
      durationMs,
      error: errorMessage,
    });

    // Update task status
    const failures = isFailed ? (task.consecutiveFailures || 0) + 1 : 0;
    await ctx.runMutation(internal.tasks.updateAfterRun, {
      id,
      lastRunStatus: runStatus,
      consecutiveFailures: failures,
      status: failures >= 5 ? "error" : undefined,
      nextRunAt: computeNextRunAt(task.schedule, task.timezone),
    });

    // Send notifications
    await sendNotificationsForTask(ctx, id, task.name, runStatus, durationMs, run.runId, errorMessage, completed.result);

    return { success: true, runId: run.runId };
  },
});

export const triggerInternal = internalAction({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.runQuery(internal.tasks.internalGet, { id });
    if (!task) return;
    if (task.activeRunId) return;

    const apiKey = process.env.SUBCONSCIOUS_API_KEY;
    if (!apiKey) return;

    const startedAt = Date.now();

    // Immediately insert a "queued" execution result for real-time UI
    const resultId = await ctx.runMutation(internal.executionResults.createPending, {
      taskId: id,
      runId: "",
      status: "queued",
      startedAt,
    });

    const runRes = await fetch(`${SUBCONSCIOUS_API}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        engine: task.engine,
        input: {
          instructions: task.prompt,
          tools: task.tools || [],
        },
      }),
    });

    if (!runRes.ok) {
      await ctx.runMutation(internal.executionResults.updateResult, {
        id: resultId,
        status: "failed",
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        error: "Failed to start run",
      });
      return;
    }

    const run = (await runRes.json()) as { runId: string };

    // Update to "running"
    await ctx.runMutation(internal.executionResults.updateResult, {
      id: resultId,
      status: "running",
      runId: run.runId,
    });

    await ctx.runMutation(internal.tasks.setActiveRun, {
      id,
      runId: run.runId,
    });

    let completed: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 150; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await fetch(`${SUBCONSCIOUS_API}/runs/${run.runId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!pollRes.ok) continue;

      const pollData = (await pollRes.json()) as Record<string, unknown>;
      if (pollData.status === "running" || pollData.status === "queued") {
        continue;
      }

      completed = pollData;
      break;
    }

    const completedAt = Date.now();
    const durationMs = completedAt - startedAt;

    if (!completed) {
      await ctx.runMutation(internal.executionResults.updateResult, {
        id: resultId,
        status: "failed",
        completedAt,
        durationMs,
        error: "Run timed out",
      });
      await ctx.runMutation(internal.tasks.updateAfterRun, {
        id,
        lastRunStatus: "failed",
        consecutiveFailures: (task.consecutiveFailures || 0) + 1,
        status: (task.consecutiveFailures || 0) + 1 >= 5 ? "error" : undefined,
        nextRunAt: computeNextRunAt(task.schedule, task.timezone),
      });
      return;
    }

    const runStatus = (completed.status as string) ?? "succeeded";
    const isFailed = runStatus === "failed";
    const errorMessage = isFailed ? extractError(completed) : undefined;

    // Update execution result with final data
    await ctx.runMutation(internal.executionResults.updateResult, {
      id: resultId,
      status: runStatus,
      runId: (completed.runId as string) || run.runId,
      result: completed.result ?? undefined,
      usage: completed.usage ?? undefined,
      completedAt,
      durationMs,
      error: errorMessage,
    });

    // Update task status
    const failures = isFailed ? (task.consecutiveFailures || 0) + 1 : 0;
    await ctx.runMutation(internal.tasks.updateAfterRun, {
      id,
      lastRunStatus: runStatus,
      consecutiveFailures: failures,
      status: failures >= 5 ? "error" : undefined,
      nextRunAt: computeNextRunAt(task.schedule, task.timezone),
    });

    await sendNotificationsForTask(ctx, id, task.name, runStatus, durationMs, run.runId, errorMessage, completed.result);
  },
});

// ── Helpers ──

function extractError(completed: Record<string, unknown>): string {
  if (completed.result && typeof completed.result === "object" && "error" in (completed.result as object)) {
    return String((completed.result as Record<string, unknown>).error);
  }
  if (completed.result && typeof completed.result === "object") {
    const r = completed.result as Record<string, unknown>;
    const isEmpty = Object.values(r).every((v) => v === "" || v === null || v === undefined);
    if (isEmpty) return "Agent returned empty results — check your prompt or engine configuration.";
  }
  return "Run failed";
}

function formatResultForEmail(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") return result || null;
  if (typeof result === "object") {
    const r = result as Record<string, unknown>;
    // Check for common result shapes
    if ("output" in r && typeof r.output === "string" && r.output) return r.output;
    if ("answer" in r && typeof r.answer === "string" && r.answer) return r.answer;
    if ("text" in r && typeof r.text === "string" && r.text) return r.text;
    if ("content" in r && typeof r.content === "string" && r.content) return r.content;
    // Check for empty results
    const entries = Object.entries(r);
    const allEmpty = entries.length > 0 && entries.every(([, v]) => v === "" || v === null || v === undefined);
    if (allEmpty) return null;
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

async function sendNotificationsForTask(
  ctx: any,
  taskId: Id<"tasks">,
  taskName: string,
  status: string,
  durationMs: number,
  runId: string,
  error?: string,
  result?: unknown,
) {
  try {
    const prefs = await ctx.runQuery(internal.notificationPrefs.getByTaskInternal, { taskId });
    if (!prefs || !prefs.enabled || !prefs.channels || prefs.channels.length === 0) return;

    const isSuccess = status === "succeeded";
    const isFailed = status === "failed";
    const statusLabel = isSuccess ? "Completed" : "Failed";
    const duration = `${(durationMs / 1000).toFixed(1)}s`;
    const resultText = formatResultForEmail(result);

    for (const channel of prefs.channels as any[]) {
      const shouldSend =
        (isSuccess && channel.onSuccess) || (isFailed && channel.onFailure);
      if (!shouldSend) continue;

      if (channel.channel === "resend") {
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_EMAIL || "notifications@yourdomain.com";
        if (!apiKey || !channel.to) continue;

        // Subject: use custom or default
        const subject = channel.customSubject
          ? channel.customSubject
          : `[Task] ${taskName}: ${statusLabel}`;

        // Body: use custom template or default
        let body: string;
        const includeResult = channel.includeResult !== false;
        const truncated = resultText
          ? resultText.length > 5000
            ? resultText.slice(0, 5000) + "\n\n... (truncated)"
            : resultText
          : "";

        if (channel.customBody) {
          // Replace {{...agentResponse}} placeholder with actual agent output
          if (channel.customBody.includes("{{...agentResponse}}")) {
            body = channel.customBody.replace(
              /\{\{\.\.\.agentResponse\}\}/g,
              truncated || "(no output)",
            );
          } else {
            // No placeholder found — use custom body and append result
            body = channel.customBody;
            if (includeResult && truncated) {
              body += `\n\n--- Agent Output ---\n${truncated}`;
            }
          }
        } else {
          body = `Task: ${taskName}\nStatus: ${statusLabel}\nDuration: ${duration}\nRun ID: ${runId || "N/A"}`;
          if (error) body += `\nError: ${error}`;
          if (includeResult && truncated) {
            body += `\n\n--- Agent Output ---\n${truncated}`;
          }
        }

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: channel.to, subject, text: body }),
        }).catch(() => {});
      }

    }
  } catch {
    // Notifications are best-effort
  }
}
