export interface TourStep {
  id: string;
  /** CSS selector for the target element, or null for full-overlay steps */
  targetSelector: string | null;
  title: string;
  description: string;
  tooltipSide: "top" | "bottom" | "left" | "right";
  /** Action to run before showing this step */
  beforeShow?: "open-chat" | null;
  spotlightPadding?: number;
  spotlightBorderRadius?: number;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetSelector: null,
    title: "Welcome to your dashboard!",
    description:
      "Let us show you around. This quick tour will help you get the most out of your AI agent scheduler.",
    tooltipSide: "bottom",
  },
  {
    id: "tasks-area",
    targetSelector: "[data-tour='tasks-area']",
    title: "Your command center",
    description:
      "All your scheduled AI agents live here. You can see their status, when they last ran, and when they'll run next.",
    tooltipSide: "bottom",
    spotlightPadding: 12,
    spotlightBorderRadius: 16,
  },
  {
    id: "new-task-button",
    targetSelector: "[data-tour='new-task']",
    title: "Create new agents",
    description:
      "Click here to set up a new scheduled task. Pick a template or start from scratch — your agent runs automatically on the schedule you set.",
    tooltipSide: "bottom",
    spotlightPadding: 8,
    spotlightBorderRadius: 10,
  },
  {
    id: "chat-sidebar",
    targetSelector: "[data-tour='chat-panel']",
    title: "Your AI assistant",
    description:
      "Chat with your assistant to manage tasks, check statuses, or ask questions. It can create and modify agents for you conversationally.",
    tooltipSide: "left",
    beforeShow: "open-chat",
    spotlightPadding: 0,
    spotlightBorderRadius: 0,
  },
  {
    id: "completion",
    targetSelector: null,
    title: "You're all set!",
    description:
      "You know the basics. Create your first agent or chat with the assistant to get started.",
    tooltipSide: "bottom",
  },
];
