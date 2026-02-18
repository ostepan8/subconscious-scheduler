import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";

// ── Public query (for useQuery in the UI) ──

export const getForConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    return ctx.db
      .query("pendingQuestions")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
  },
});

// ── Public mutation (called from UI when user answers) ──

export const answer = mutation({
  args: { id: v.id("pendingQuestions"), answer: v.string() },
  handler: async (ctx, { id, answer }) => {
    const question = await ctx.db.get(id);
    if (!question) throw new Error("Question not found");
    if (question.status !== "pending") throw new Error("Question already answered");
    await ctx.db.patch(id, { answer, status: "answered" });
  },
});

// ── Internal mutations/queries (for HTTP action in tools.ts) ──

export const internalCreate = internalMutation({
  args: {
    conversationId: v.string(),
    question: v.string(),
    options: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { conversationId, question, options }) => {
    // Expire any existing pending questions for this conversation
    const existing = await ctx.db
      .query("pendingQuestions")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const q of existing) {
      await ctx.db.patch(q._id, { status: "expired" });
    }

    return ctx.db.insert("pendingQuestions", {
      conversationId,
      question,
      options,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const internalGet = internalQuery({
  args: { id: v.id("pendingQuestions") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const internalExpire = internalMutation({
  args: { id: v.id("pendingQuestions") },
  handler: async (ctx, { id }) => {
    const question = await ctx.db.get(id);
    if (question && question.status === "pending") {
      await ctx.db.patch(id, { status: "expired" });
    }
  },
});
