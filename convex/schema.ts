import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  tasks: defineTable({
    name: v.string(),
    type: v.string(), // "research" | "sync" | "digest"
    prompt: v.string(),
    schedule: v.string(), // cron expression
    status: v.string(), // "active" | "paused" | "error"
    engine: v.string(), // "tim-gpt" | "tim-edge" | "tim-gpt-heavy"
    tools: v.array(v.any()),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(v.string()),
    nextRunAt: v.optional(v.number()),
    consecutiveFailures: v.number(),
    activeRunId: v.optional(v.string()),
    timezone: v.optional(v.string()), // IANA timezone e.g. "America/New_York"
  }).index("by_userId", ["userId"]),

  executionResults: defineTable({
    taskId: v.id("tasks"),
    runId: v.string(),
    status: v.string(),
    result: v.optional(v.any()),
    usage: v.optional(v.any()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_task", ["taskId"])
    .index("by_task_started", ["taskId", "startedAt"]),

  notificationPrefs: defineTable({
    taskId: v.id("tasks"),
    enabled: v.boolean(),
    channels: v.any(),
  }).index("by_task", ["taskId"]),

  conversations: defineTable({
    externalId: v.string(),
    userId: v.optional(v.id("users")),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_userId", ["userId"]),

  messages: defineTable({
    conversationId: v.string(),
    messageId: v.string(),
    role: v.string(),
    content: v.string(),
    timestamp: v.string(),
  }).index("by_conversationId", ["conversationId"]),

  pendingQuestions: defineTable({
    conversationId: v.string(),
    question: v.string(),
    options: v.optional(v.array(v.string())),
    answer: v.optional(v.string()),
    status: v.string(), // "pending" | "answered" | "expired"
    createdAt: v.number(),
  }).index("by_conversationId", ["conversationId"]),
});
