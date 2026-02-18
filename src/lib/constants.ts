import type { Engine } from "./subconscious-types";

export const DEFAULT_ENGINE: Engine = "tim-gpt";

export const ENGINE_OPTIONS = [
  { value: "tim-edge", label: "TIM Edge", description: "Fast", detail: "Quick & efficient" },
  { value: "timini", label: "TIMINI", description: "Reasoning", detail: "Gemini-backed" },
  { value: "tim-gpt", label: "TIM GPT", description: "Smart", detail: "GPT-4.1 backed" },
  { value: "tim-gpt-heavy", label: "TIM GPT Heavy", description: "Smartest", detail: "GPT-5.2 backed" },
] as const;

export const DEFAULT_TOOLS = [
  { type: "platform" as const, id: "web_search" },
  { type: "platform" as const, id: "fast_search" },
  { type: "platform" as const, id: "page_reader" },
  { type: "platform" as const, id: "news_search" },
  { type: "platform" as const, id: "google_search" },
];
