import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * One-time migration: assigns all conversations and tasks that have no userId
 * to the currently authenticated user. Run this once per user after deploying
 * the userId schema changes.
 */
export const claimOrphanedData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Claim orphaned conversations
    const allConvos = await ctx.db.query("conversations").collect();
    let claimedConvos = 0;
    for (const convo of allConvos) {
      if (!convo.userId) {
        await ctx.db.patch(convo._id, { userId });
        claimedConvos++;
      }
    }

    // Claim orphaned tasks
    const allTasks = await ctx.db.query("tasks").collect();
    let claimedTasks = 0;
    for (const task of allTasks) {
      if (!task.userId) {
        await ctx.db.patch(task._id, { userId });
        claimedTasks++;
      }
    }

    return { claimedConvos, claimedTasks };
  },
});
