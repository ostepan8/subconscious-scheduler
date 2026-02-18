import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import cronParser from "cron-parser";

function computeNextRunAt(schedule: string, timezone?: string): number | undefined {
  try {
    const options = timezone ? { tz: timezone } : {};
    const interval = cronParser.parseExpression(schedule, options);
    return interval.next().toDate().getTime();
  } catch {
    return undefined;
  }
}

// ── Queries ──

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    // Sort: active first, then paused, then error; within same status by lastRunAt desc
    const order: Record<string, number> = { active: 0, paused: 1, error: 2 };
    return tasks.sort((a, b) => {
      const statusDiff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      if (a.lastRunAt && b.lastRunAt) return b.lastRunAt - a.lastRunAt;
      if (a.lastRunAt) return -1;
      if (b.lastRunAt) return 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    return {
      total: tasks.length,
      active: tasks.filter((t) => t.status === "active").length,
      errored: tasks.filter((t) => t.status === "error").length,
      running: tasks.filter((t) => t.activeRunId).length,
    };
  },
});

// ── Internal queries (for HTTP actions / crons) ──

export const internalGet = internalQuery({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("tasks").collect();
  },
});

export const getWithResults = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return null;
    const results = await ctx.db
      .query("executionResults")
      .withIndex("by_task_started", (q) => q.eq("taskId", taskId))
      .order("desc")
      .take(5);
    return { task, results };
  },
});

export const getActiveTasks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    return tasks.filter(
      (t) => t.status === "active" && !t.activeRunId && t.nextRunAt
    );
  },
});

// ── Mutations ──

export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    prompt: v.string(),
    schedule: v.string(),
    engine: v.string(),
    tools: v.optional(v.array(v.any())),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const count = (await ctx.db.query("tasks").collect()).length;
    if (count >= 50) throw new Error("Maximum 50 tasks allowed");

    const now = Date.now();
    return ctx.db.insert("tasks", {
      name: args.name,
      type: args.type,
      prompt: args.prompt,
      schedule: args.schedule,
      status: "active",
      engine: args.engine,
      tools: args.tools ?? [],
      createdAt: now,
      updatedAt: now,
      consecutiveFailures: 0,
      nextRunAt: computeNextRunAt(args.schedule, args.timezone),
      timezone: args.timezone,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    prompt: v.optional(v.string()),
    schedule: v.optional(v.string()),
    status: v.optional(v.string()),
    engine: v.optional(v.string()),
    tools: v.optional(v.array(v.any())),
    nextRunAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.prompt !== undefined) patch.prompt = updates.prompt;
    if (updates.schedule !== undefined) patch.schedule = updates.schedule;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.engine !== undefined) patch.engine = updates.engine;
    if (updates.tools !== undefined) patch.tools = updates.tools;
    if (updates.timezone !== undefined) patch.timezone = updates.timezone;
    if (updates.nextRunAt !== undefined) {
      patch.nextRunAt = updates.nextRunAt;
    } else if (updates.schedule !== undefined) {
      const tz = updates.timezone ?? task.timezone;
      patch.nextRunAt = computeNextRunAt(updates.schedule, tz);
    }

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");

    // Cascade delete execution results
    const results = await ctx.db
      .query("executionResults")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();
    for (const r of results) {
      await ctx.db.delete(r._id);
    }

    // Cascade delete notification prefs
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();
    for (const p of prefs) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(id);
  },
});

// ── Internal mutations (for actions / crons) ──

export const createFromTool = internalMutation({
  args: {
    name: v.string(),
    type: v.string(),
    prompt: v.string(),
    schedule: v.string(),
    engine: v.string(),
    tools: v.optional(v.array(v.any())),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const count = (await ctx.db.query("tasks").collect()).length;
    if (count >= 50) throw new Error("Maximum 50 tasks allowed");

    const now = Date.now();
    return ctx.db.insert("tasks", {
      name: args.name,
      type: args.type,
      prompt: args.prompt,
      schedule: args.schedule,
      status: "active",
      engine: args.engine,
      tools: args.tools ?? [],
      createdAt: now,
      updatedAt: now,
      consecutiveFailures: 0,
      nextRunAt: computeNextRunAt(args.schedule, args.timezone),
      timezone: args.timezone,
    });
  },
});

export const setActiveRun = internalMutation({
  args: { id: v.id("tasks"), runId: v.string() },
  handler: async (ctx, { id, runId }) => {
    await ctx.db.patch(id, {
      activeRunId: runId,
      lastRunAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const clearActiveRun = internalMutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      activeRunId: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const updateAfterRun = internalMutation({
  args: {
    id: v.id("tasks"),
    lastRunStatus: v.string(),
    consecutiveFailures: v.number(),
    status: v.optional(v.string()),
    nextRunAt: v.optional(v.number()),
  },
  handler: async (ctx, { id, lastRunStatus, consecutiveFailures, status, nextRunAt }) => {
    const patch: Record<string, unknown> = {
      lastRunStatus,
      consecutiveFailures,
      activeRunId: undefined,
      updatedAt: Date.now(),
    };
    if (status !== undefined) patch.status = status;
    if (nextRunAt !== undefined) patch.nextRunAt = nextRunAt;
    await ctx.db.patch(id, patch);
  },
});

export const internalUpdate = internalMutation({
  args: {
    id: v.id("tasks"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    prompt: v.optional(v.string()),
    schedule: v.optional(v.string()),
    status: v.optional(v.string()),
    engine: v.optional(v.string()),
    tools: v.optional(v.array(v.any())),
    nextRunAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.prompt !== undefined) patch.prompt = updates.prompt;
    if (updates.schedule !== undefined) patch.schedule = updates.schedule;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.engine !== undefined) patch.engine = updates.engine;
    if (updates.tools !== undefined) patch.tools = updates.tools;
    if (updates.timezone !== undefined) patch.timezone = updates.timezone;
    if (updates.nextRunAt !== undefined) {
      patch.nextRunAt = updates.nextRunAt;
    } else if (updates.schedule !== undefined) {
      const tz = updates.timezone ?? task.timezone;
      patch.nextRunAt = computeNextRunAt(updates.schedule, tz);
    }

    await ctx.db.patch(id, patch);
  },
});

export const internalRemove = internalMutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const results = await ctx.db
      .query("executionResults")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();
    for (const r of results) {
      await ctx.db.delete(r._id);
    }

    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();
    for (const p of prefs) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(id);
  },
});
