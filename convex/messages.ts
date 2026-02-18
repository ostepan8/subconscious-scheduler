import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const MAX_MESSAGES = 50;

export const listByConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .collect();
    // Return newest last, capped at MAX_MESSAGES
    return messages.slice(-MAX_MESSAGES);
  },
});

export const save = mutation({
  args: {
    conversationId: v.string(),
    messageId: v.string(),
    role: v.string(),
    content: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", args);

    // Enforce rolling window — delete oldest if over limit
    const all = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    if (all.length > MAX_MESSAGES) {
      const toDelete = all.slice(0, all.length - MAX_MESSAGES);
      for (const msg of toDelete) {
        await ctx.db.delete(msg._id);
      }
    }
  },
});

export const clear = mutation({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});

// Internal version for use in other Convex functions (e.g. conversation deletion)
export const clearInternal = internalMutation({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});
