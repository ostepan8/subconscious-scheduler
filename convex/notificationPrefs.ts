import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

function generateToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36)[2]
  ).join("");
}

export const getByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .first();
    return prefs ?? { enabled: false, channels: [] };
  },
});

export const getByTaskInternal = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    return ctx.db
      .query("notificationPrefs")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    taskId: v.id("tasks"),
    enabled: v.boolean(),
    channels: v.any(),
  },
  handler: async (ctx, { taskId, enabled, channels }) => {
    const existing = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .first();

    if (existing) {
      const patch: Record<string, unknown> = { enabled, channels };
      if (!existing.unsubscribeToken) {
        patch.unsubscribeToken = generateToken();
      }
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("notificationPrefs", {
        taskId,
        enabled,
        channels,
        unsubscribeToken: generateToken(),
      });
    }
  },
});

// Public query: look up notification info by unsubscribe token (no auth required)
export const getByUnsubscribeToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_unsubscribeToken", (q) => q.eq("unsubscribeToken", token))
      .first();
    if (!prefs) return null;

    const task = await ctx.db.get(prefs.taskId);
    return {
      taskName: task?.name ?? "Unknown task",
      enabled: prefs.enabled,
    };
  },
});

// Public mutation: disable notifications by unsubscribe token (no auth required)
export const unsubscribeByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_unsubscribeToken", (q) => q.eq("unsubscribeToken", token))
      .first();
    if (!prefs) return { success: false };

    await ctx.db.patch(prefs._id, { enabled: false });
    return { success: true };
  },
});

export const removeByTask = internalMutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();
    for (const p of prefs) {
      await ctx.db.delete(p._id);
    }
  },
});
