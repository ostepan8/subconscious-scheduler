import {
  query,
  mutation,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ── Public queries (for useQuery in the UI) ──

export const list = query({
  args: {},
  handler: async (ctx) => {
    const convos = await ctx.db.query("conversations").collect();
    return convos.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    return ctx.db
      .query("conversations")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
  },
});

// ── Public mutations (called from UI via useMutation) ──

export const create = mutation({
  args: { externalId: v.string(), title: v.optional(v.string()) },
  handler: async (ctx, { externalId, title }) => {
    const now = Date.now();
    return ctx.db.insert("conversations", {
      externalId,
      title: title ?? "New Chat",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: { externalId: v.string(), title: v.string() },
  handler: async (ctx, { externalId, title }) => {
    const convo = await ctx.db
      .query("conversations")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!convo) throw new Error("Conversation not found");
    await ctx.db.patch(convo._id, { title, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const convo = await ctx.db
      .query("conversations")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!convo) throw new Error("Conversation not found");
    await ctx.db.delete(convo._id);
    // Also clean up associated messages
    await ctx.scheduler.runAfter(0, internal.messages.clearInternal, { conversationId: externalId });
  },
});

// ── Internal mutations (for HTTP tool actions) ──

export const setTitle = internalMutation({
  args: { externalId: v.string(), title: v.string() },
  handler: async (ctx, { externalId, title }) => {
    const convo = await ctx.db
      .query("conversations")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!convo) throw new Error("Conversation not found");
    await ctx.db.patch(convo._id, { title, updatedAt: Date.now() });
  },
});
