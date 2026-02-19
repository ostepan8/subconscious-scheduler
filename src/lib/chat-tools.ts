import type { Tool, PlatformTool, FunctionTool } from "./subconscious-types";

export function buildChatTools(baseUrl: string, toolSecret: string): Tool[] {
  const s = `?secret=${toolSecret}`;

  const platformTools: PlatformTool[] = [
    {
      type: "platform" as const,
      id: "fast_search",
      options: {},
    },
  ];

  const functionTools: FunctionTool[] = [
    {
      type: "function" as const,
      name: "list_tasks",
      description:
        "List all scheduled tasks with their name, status, schedule, engine, last run time, and next run time.",
      url: `${baseUrl}/tools/list-tasks${s}`,
      method: "POST" as const,
      timeout: 15,
      parameters: {
        type: "object" as const,
        properties: {},
        required: [] as string[],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "create_task",
      description:
        "Propose a new scheduled task for the user to approve. Returns a proposal — the task is NOT created until the user approves it in the UI. Common schedules: '0 9 * * *' = daily at 9am, '*/15 * * * *' = every 15 minutes, '0 */6 * * *' = every 6 hours, '0 9 * * 1' = weekly Monday 9am.",
      url: `${baseUrl}/tools/create-task${s}`,
      method: "POST" as const,
      timeout: 15,
      parameters: {
        type: "object" as const,
        properties: {
          name: {
            type: "string" as const,
            description: "Task name (1-100 characters)",
          },
          prompt: {
            type: "string" as const,
            description: "Instructions for the agent — what it should do each run",
          },
          schedule: {
            type: "string" as const,
            description: "Cron expression for the schedule",
          },
          engine: {
            type: "string" as const,
            description:
              "Engine to use: tim-gpt (smart, default), tim-edge (fast), timini (reasoning), or tim-gpt-heavy (smartest)",
          },
        },
        required: ["name", "prompt", "schedule"],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "update_task",
      description:
        "Update an existing task. Can change name, prompt, schedule, status (active/paused), or engine. To pause a task, set status to 'paused'. To resume, set status to 'active'.",
      url: `${baseUrl}/tools/update-task${s}`,
      method: "POST" as const,
      timeout: 15,
      parameters: {
        type: "object" as const,
        properties: {
          taskId: {
            type: "string" as const,
            description: "The task ID to update",
          },
          name: {
            type: "string" as const,
            description: "New task name",
          },
          prompt: {
            type: "string" as const,
            description: "New agent instructions",
          },
          schedule: {
            type: "string" as const,
            description: "New cron schedule",
          },
          status: {
            type: "string" as const,
            description: "Set to 'active' or 'paused'",
          },
          engine: {
            type: "string" as const,
            description: "New engine",
          },
        },
        required: ["taskId"],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "delete_task",
      description:
        "Permanently delete a scheduled task and all its execution history. This cannot be undone.",
      url: `${baseUrl}/tools/delete-task${s}`,
      method: "POST" as const,
      timeout: 15,
      parameters: {
        type: "object" as const,
        properties: {
          taskId: {
            type: "string" as const,
            description: "The task ID to delete",
          },
        },
        required: ["taskId"],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "trigger_task",
      description:
        "Manually trigger a task to run immediately, regardless of its schedule. Returns the run ID. The task must not already be running.",
      url: `${baseUrl}/tools/trigger-task${s}`,
      method: "POST" as const,
      timeout: 30,
      parameters: {
        type: "object" as const,
        properties: {
          taskId: {
            type: "string" as const,
            description: "The task ID to trigger",
          },
        },
        required: ["taskId"],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "get_task_details",
      description:
        "Get detailed information about a specific task including its full configuration and recent execution results.",
      url: `${baseUrl}/tools/get-task${s}`,
      method: "POST" as const,
      timeout: 15,
      parameters: {
        type: "object" as const,
        properties: {
          taskId: {
            type: "string" as const,
            description: "The task ID to look up",
          },
        },
        required: ["taskId"],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "title_conversation",
      description:
        "Set a short, descriptive title for the current conversation. Call this after the user's first message to give the conversation a meaningful name. The title should be concise (2-6 words) and capture the topic or intent.",
      url: `${baseUrl}/tools/title-conversation${s}`,
      method: "POST" as const,
      timeout: 10,
      parameters: {
        type: "object" as const,
        properties: {
          conversationId: {
            type: "string" as const,
            description: "The conversation ID to title",
          },
          title: {
            type: "string" as const,
            description: "A short, descriptive title (2-6 words)",
          },
        },
        required: ["conversationId", "title"],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "ask_question",
      description:
        "Ask the user a clarifying question and wait for their response. Use this when you need specific information from the user to proceed — like a preferred time, frequency, engine choice, or any other detail. The tool blocks until the user responds (up to 90 seconds). Returns the user's answer as a string.",
      url: `${baseUrl}/tools/ask-question${s}`,
      method: "POST" as const,
      timeout: 120,
      parameters: {
        type: "object" as const,
        properties: {
          conversationId: {
            type: "string" as const,
            description: "The current conversation ID",
          },
          question: {
            type: "string" as const,
            description: "The question to ask the user",
          },
          options: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "Optional preset answer choices. Include common options when applicable. The user can also type a custom answer.",
          },
        },
        required: ["conversationId", "question"],
        additionalProperties: false,
      },
    },
    {
      type: "function" as const,
      name: "fetch_url",
      description:
        "Fetch and extract the readable text content from a web page URL. Use this to read articles, documentation, or any web page the user shares or that you find via search.",
      url: `${baseUrl}/tools/fetch-url${s}`,
      method: "POST" as const,
      timeout: 30,
      parameters: {
        type: "object" as const,
        properties: {
          url: {
            type: "string" as const,
            description: "The full URL to fetch (must start with http:// or https://)",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  ];

  return [...platformTools, ...functionTools];
}
