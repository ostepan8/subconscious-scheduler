import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("executionResults") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    return ctx.db
      .query("executionResults")
      .withIndex("by_task_started", (q) => q.eq("taskId", taskId))
      .order("desc")
      .take(20);
  },
});

export const store = internalMutation({
  args: {
    taskId: v.id("tasks"),
    runId: v.string(),
    status: v.string(),
    result: v.optional(v.any()),
    usage: v.optional(v.any()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Enforce max 100 results per task
    const existing = await ctx.db
      .query("executionResults")
      .withIndex("by_task_started", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();

    if (existing.length >= 100) {
      const toRemove = existing.slice(0, existing.length - 99);
      for (const r of toRemove) {
        await ctx.db.delete(r._id);
      }
    }

    return ctx.db.insert("executionResults", args);
  },
});

// Insert a queued/running placeholder that shows up instantly in real-time UI
export const createPending = internalMutation({
  args: {
    taskId: v.id("tasks"),
    runId: v.string(),
    status: v.string(),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("executionResults", {
      taskId: args.taskId,
      runId: args.runId,
      status: args.status,
      startedAt: args.startedAt,
    });
  },
});

// Update an in-progress execution result with new status/data
export const updateResult = internalMutation({
  args: {
    id: v.id("executionResults"),
    status: v.optional(v.string()),
    runId: v.optional(v.string()),
    result: v.optional(v.any()),
    usage: v.optional(v.any()),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;

    const patch: Record<string, unknown> = {};
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.runId !== undefined) patch.runId = updates.runId;
    if (updates.result !== undefined) patch.result = updates.result;
    if (updates.usage !== undefined) patch.usage = updates.usage;
    if (updates.completedAt !== undefined) patch.completedAt = updates.completedAt;
    if (updates.durationMs !== undefined) patch.durationMs = updates.durationMs;
    if (updates.error !== undefined) patch.error = updates.error;

    await ctx.db.patch(id, patch);
  },
});

export const removeByTask = internalMutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const results = await ctx.db
      .query("executionResults")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();
    for (const r of results) {
      await ctx.db.delete(r._id);
    }
  },
});
