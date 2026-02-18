import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

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
      await ctx.db.patch(existing._id, { enabled, channels });
    } else {
      await ctx.db.insert("notificationPrefs", { taskId, enabled, channels });
    }
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
