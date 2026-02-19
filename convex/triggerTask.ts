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
          instructions: task.prompt + "\n\nIMPORTANT: Write your response in plain text only. Do not use markdown formatting (no **, ##, ---, `, or | table syntax). Write naturally as if you were a knowledgeable person sending a colleague a clear, well-organized email. Use short paragraphs and line breaks for readability.",
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
          instructions: task.prompt + "\n\nIMPORTANT: Write your response in plain text only. Do not use markdown formatting (no **, ##, ---, `, or | table syntax). Write naturally as if you were a knowledgeable person sending a colleague a clear, well-organized email. Use short paragraphs and line breaks for readability.",
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

function extractResultText(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") return result || null;
  if (typeof result === "object") {
    const r = result as Record<string, unknown>;
    // Extract the actual answer from common result shapes
    const raw =
      (typeof r.answer === "string" && r.answer) ||
      (typeof r.output === "string" && r.output) ||
      (typeof r.text === "string" && r.text) ||
      (typeof r.content === "string" && r.content) ||
      null;
    if (raw) return raw;
    const entries = Object.entries(r);
    const allEmpty = entries.length > 0 && entries.every(([, v]) => v === "" || v === null || v === undefined);
    if (allEmpty) return null;
    // Try to extract from nested JSON string
    try {
      const jsonStr = JSON.stringify(r);
      const answerMatch = jsonStr.match(/"(?:answer|final_answer|output)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (answerMatch) {
        return answerMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }
    } catch { /* ignore */ }
  }
  try { return JSON.stringify(result, null, 2); } catch { return String(result); }
}

/** Strip markdown formatting to produce clean plain text */
function stripMarkdown(text: string): string {
  return text
    // Remove bold/italic markers
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove horizontal rules
    .replace(/^---+$/gm, "")
    // Remove markdown links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown table alignment rows
    .replace(/^\|[-:\s|]+\|$/gm, "")
    // Clean up table pipes into readable format
    .replace(/^\|(.+)\|$/gm, (_, row) =>
      row.split("|").map((c: string) => c.trim()).filter(Boolean).join("  —  ")
    )
    // Remove backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove "Thought:" preamble blocks
    .replace(/\*?Thought\*?:[^\n]*\n---/g, "")
    // Collapse 3+ newlines into 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendNotificationsForTask(
  ctx: any,
  taskId: Id<"tasks">,
  taskName: string,
  status: string,
  _durationMs: number,
  _runId: string,
  error?: string,
  result?: unknown,
) {
  try {
    const prefs = await ctx.runQuery(internal.notificationPrefs.getByTaskInternal, { taskId });
    if (!prefs || !prefs.enabled || !prefs.channels || prefs.channels.length === 0) return;

    const isSuccess = status === "succeeded";
    const isFailed = status === "failed";
    const rawText = extractResultText(result);
    const cleanText = rawText ? stripMarkdown(rawText) : null;

    for (const channel of prefs.channels as any[]) {
      const shouldSend =
        (isSuccess && channel.onSuccess) || (isFailed && channel.onFailure);
      if (!shouldSend) continue;

      if (channel.channel === "resend") {
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_EMAIL || "subconscious-scheduler@subconscious.dev";
        if (!apiKey || !channel.to) continue;

        const subject = channel.customSubject || taskName;

        let body: string;
        if (isFailed) {
          body = `Your scheduled task "${taskName}" failed to complete.\n\n${error || "An unknown error occurred. Check the dashboard for details."}`;
        } else if (channel.customBody && channel.customBody.includes("{{...agentResponse}}")) {
          body = channel.customBody.replace(
            /\{\{\.\.\.agentResponse\}\}/g,
            cleanText || "(No results were returned.)",
          );
        } else {
          body = cleanText || "The task completed but returned no output.";
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
