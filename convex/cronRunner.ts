import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const checkDueTasks = internalAction({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.runQuery(internal.tasks.getActiveTasks);
    const now = Date.now();

    for (const task of tasks) {
      if (task.nextRunAt && now >= task.nextRunAt) {
        // Prevent double-triggering by setting nextRunAt far in the future
        await ctx.runMutation(internal.cronRunner.markTaskScheduled, {
          id: task._id,
        });

        // Trigger the task
        try {
          await ctx.runAction(internal.triggerTask.triggerInternal, {
            id: task._id,
          });
        } catch {
          // Errors handled inside triggerInternal
        }
      }
    }
  },
});

export const markTaskScheduled = internalMutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.db.get(id);
    if (!task) return;

    // Set nextRunAt far in the future temporarily to prevent double-triggering.
    // The updateAfterRun mutation will compute the real next run time.
    await ctx.db.patch(id, {
      nextRunAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
  },
});
