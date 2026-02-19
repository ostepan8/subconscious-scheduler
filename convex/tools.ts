import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ── title_conversation ──
export const titleConversation = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const { conversationId, title } = await parseBody(request);
    if (!conversationId || !title) {
      return json(
        { error: "conversationId and title are required" },
        400
      );
    }

    await ctx.runMutation(internal.conversations.setTitle, {
      externalId: conversationId as string,
      title: title as string,
    });

    return json({
      success: true,
      message: `Conversation titled: "${title}"`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to title conversation";
    return json({ error: msg }, 500);
  }
});

function verifySecret(request: Request): boolean {
  const url = new URL(request.url);
  return url.searchParams.get("secret") === process.env.TOOL_ENDPOINT_SECRET;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Subconscious sends: { parameters: { ...args } } — extract the inner params. */
async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    if (raw.parameters && typeof raw.parameters === "object") {
      return raw.parameters as Record<string, unknown>;
    }
    return raw;
  } catch {
    return {};
  }
}

// ── list_tasks ──
export const listTasks = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  const tasks = await ctx.runQuery(internal.tasks.listAll);

  const summary = tasks.map((t) => ({
    id: t._id,
    name: t.name,
    status: t.status,
    schedule: t.schedule,
    engine: t.engine,
    lastRunAt: t.lastRunAt ? new Date(t.lastRunAt).toISOString() : null,
    lastRunStatus: t.lastRunStatus ?? null,
    nextRunAt: t.nextRunAt ? new Date(t.nextRunAt).toISOString() : null,
    consecutiveFailures: t.consecutiveFailures,
  }));

  return json({ tasks: summary, count: summary.length });
});

// ── create_task (returns proposal for human approval) ──
export const createTask = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await parseBody(request);
    const { name, prompt, schedule, engine } = body;
    if (!name || !prompt || !schedule) {
      return json(
        { error: "Missing required fields: name, prompt, schedule" },
        400
      );
    }

    // Validate task count limit before proposing
    const tasks = await ctx.runQuery(internal.tasks.listAll);
    if (tasks.length >= 50) {
      return json({ error: "Maximum 50 tasks allowed" }, 400);
    }

    // Return proposal for human approval — task is NOT created yet
    return json({
      proposal: true,
      message:
        "Task proposal ready. Present it to the user using the :::task-proposal format so they can approve it.",
      task: {
        name: name as string,
        prompt: prompt as string,
        schedule: schedule as string,
        engine: (engine as string) || "tim-gpt",
      },
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to create task proposal";
    return json({ error: msg }, 500);
  }
});

// ── update_task ──
export const updateTask = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await parseBody(request);
    const { taskId, name, prompt, schedule, status, engine } = body;
    if (!taskId) return json({ error: "taskId is required" }, 400);

    const task = await ctx.runQuery(internal.tasks.internalGet, {
      id: taskId as Id<"tasks">,
    });
    if (!task) return json({ error: `Task not found: ${taskId}` }, 404);

    await ctx.runMutation(internal.tasks.internalUpdate, {
      id: taskId as Id<"tasks">,
      ...(name ? { name: name as string } : {}),
      ...(prompt ? { prompt: prompt as string } : {}),
      ...(schedule ? { schedule: schedule as string } : {}),
      ...(status ? { status: status as string } : {}),
      ...(engine ? { engine: engine as string } : {}),
    });

    return json({
      success: true,
      task: {
        id: task._id,
        name: (name as string) || task.name,
        status: (status as string) || task.status,
        schedule: (schedule as string) || task.schedule,
        engine: (engine as string) || task.engine,
      },
    });
  } catch {
    return json({ error: "Failed to update task" }, 500);
  }
});

// ── delete_task ──
export const deleteTask = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const { taskId } = await parseBody(request);
    if (!taskId) return json({ error: "taskId is required" }, 400);

    const task = await ctx.runQuery(internal.tasks.internalGet, {
      id: taskId as Id<"tasks">,
    });
    if (!task) return json({ error: `Task not found: ${taskId}` }, 404);

    await ctx.runMutation(internal.tasks.internalRemove, {
      id: taskId as Id<"tasks">,
    });

    return json({
      success: true,
      message: `Task "${task.name}" has been deleted`,
    });
  } catch {
    return json({ error: "Failed to delete task" }, 500);
  }
});

// ── trigger_task ──
export const triggerTask = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const { taskId } = await parseBody(request);
    if (!taskId) return json({ error: "taskId is required" }, 400);

    const task = await ctx.runQuery(internal.tasks.internalGet, {
      id: taskId as Id<"tasks">,
    });
    if (!task) return json({ error: `Task not found: ${taskId}` }, 404);
    if (task.activeRunId) return json({ error: "Task is already running" }, 409);

    // Fire the trigger action (runs in background)
    await ctx.runAction(internal.triggerTask.triggerInternal, {
      id: taskId as Id<"tasks">,
    });

    return json({
      success: true,
      message: `Task "${task.name}" has been triggered.`,
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Failed to trigger task" },
      500
    );
  }
});

// ── ask_question (blocking human-in-the-loop) ──
export const askQuestion = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await parseBody(request);
    const { conversationId, question, options } = body;
    if (!conversationId || !question) {
      return json(
        { error: "conversationId and question are required" },
        400,
      );
    }

    // Create the pending question
    const questionId = await ctx.runMutation(
      internal.pendingQuestions.internalCreate,
      {
        conversationId: conversationId as string,
        question: question as string,
        options: Array.isArray(options) ? options : undefined,
      },
    );

    // Poll for answer (up to 90 seconds)
    const maxWait = 90_000;
    const interval = 1_000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const q = await ctx.runQuery(internal.pendingQuestions.internalGet, {
        id: questionId,
      });

      if (q?.status === "answered" && q.answer) {
        return json({
          answered: true,
          answer: q.answer,
        });
      }

      // Sleep before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    // Timeout — mark as expired
    await ctx.runMutation(internal.pendingQuestions.internalExpire, {
      id: questionId,
    });

    return json({
      answered: false,
      answer: "The user did not respond in time. Continue without their input or ask again later.",
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to ask question";
    return json({ error: msg }, 500);
  }
});

// ── get_task_details ──
export const getTaskDetails = httpAction(async (ctx, request) => {
  if (!verifySecret(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const { taskId } = await parseBody(request);
    if (!taskId) return json({ error: "taskId is required" }, 400);

    const data = await ctx.runQuery(internal.tasks.getWithResults, {
      taskId: taskId as Id<"tasks">,
    });
    if (!data) return json({ error: `Task not found: ${taskId}` }, 404);

    const { task, results } = data;
    return json({
      task: {
        id: task._id,
        name: task.name,
        status: task.status,
        prompt: task.prompt,
        schedule: task.schedule,
        engine: task.engine,
        lastRunAt: task.lastRunAt ? new Date(task.lastRunAt).toISOString() : null,
        lastRunStatus: task.lastRunStatus ?? null,
        nextRunAt: task.nextRunAt ? new Date(task.nextRunAt).toISOString() : null,
        consecutiveFailures: task.consecutiveFailures,
        isRunning: !!task.activeRunId,
      },
      recentResults: results.map((r) => ({
        id: r._id,
        status: r.status,
        startedAt: new Date(r.startedAt).toISOString(),
        completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
        durationMs: r.durationMs ?? null,
        error: r.error ?? null,
        hasOutput: !!r.result,
      })),
    });
  } catch {
    return json({ error: "Failed to get task details" }, 500);
  }
});
