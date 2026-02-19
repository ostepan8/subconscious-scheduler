import { NextRequest } from "next/server";
import { Subconscious } from "subconscious";
import { buildChatTools } from "@/lib/chat-tools";
import { buildSystemPrompt, CHAT_ENGINE, extractThoughts } from "@/lib/chat-config";
import { getChatMessages, saveChatMessage } from "@/lib/chat-storage";

/**
 * Extract the user-facing answer from the raw streamed content.
 * The AI may return a JSON object with final_answer/answer, plain text,
 * or a mix of text with embedded JSON. This function tries multiple
 * strategies in order of reliability.
 */
function extractAnswer(raw: string): string {
  const trimmed = raw.trim();

  // Strategy 1: Direct JSON parse (content is a clean JSON object)
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) {
      const text = typeof parsed.final_answer === "string"
        ? parsed.final_answer
        : typeof parsed.answer === "string"
          ? parsed.answer
          : null;
      if (text) return text;
    }
  } catch {
    // Not valid JSON — continue to next strategy
  }

  // Strategy 2: Find the last JSON object in the content (final answer is
  // typically at the end, after thinking/tool output that may contain braces)
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonEnd !== -1) {
    // Scan backwards from jsonEnd to find the matching opening brace
    let depth = 0;
    for (let i = jsonEnd; i >= 0; i--) {
      if (trimmed[i] === "}") depth++;
      else if (trimmed[i] === "{") depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(trimmed.slice(i, jsonEnd + 1));
          if (typeof parsed === "object" && parsed !== null) {
            const text = typeof parsed.final_answer === "string"
              ? parsed.final_answer
              : typeof parsed.answer === "string"
                ? parsed.answer
                : null;
            if (text) return text;
          }
        } catch {
          // This JSON block didn't have what we need — continue
        }
        break;
      }
    }
  }

  // Strategy 2b: Try first-to-last brace as fallback
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
      if (typeof parsed === "object" && parsed !== null) {
        const text = typeof parsed.final_answer === "string"
          ? parsed.final_answer
          : typeof parsed.answer === "string"
            ? parsed.answer
            : null;
        if (text) return text;
      }
    } catch {
      // Embedded JSON didn't parse — continue
    }
  }

  // Strategy 3: Regex extraction for final_answer or answer value
  // Handles cases where JSON is malformed or content is very large
  for (const key of ["final_answer", "answer"]) {
    const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)
    const m = trimmed.match(regex);
    if (m) {
      return m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }

  // Strategy 4: Check for "Final Answer:" text prefix
  const prefixMatch = trimmed.match(/(?:Final Answer|final_answer):\s*([\s\S]*)/i);
  if (prefixMatch) {
    return prefixMatch[1].trim();
  }

  // Strategy 5: Return raw content as-is
  return trimmed || "I processed your request. Check the dashboard for updates.";
}

export async function POST(req: NextRequest) {
  const { message, conversationId } = (await req.json()) as {
    message: string;
    conversationId: string;
  };

  const apiKey = process.env.SUBCONSCIOUS_API_KEY;
  const toolSecret = process.env.TOOL_ENDPOINT_SECRET;
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUBCONSCIOUS_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!conversationId) {
    return new Response(
      JSON.stringify({ error: "Missing conversationId" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Save user message
  await saveChatMessage(conversationId, {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Load conversation history for context
  const history = await getChatMessages(conversationId);
  const recentHistory = history
    .slice(-30)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  // Build instructions
  const instructions = `${buildSystemPrompt(conversationId)}

## Conversation History
${recentHistory}

## Current User Message
${message}`;

  // Build tools — Convex site URL is always publicly reachable
  const tools = (convexSiteUrl && toolSecret) ? buildChatTools(convexSiteUrl, toolSecret) : [];

  // Set up client
  const client = new Subconscious({ apiKey });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = client.stream({
          engine: CHAT_ENGINE,
          input: { instructions, tools: tools as any },
        });

        let fullContent = "";
        let lastSentThoughts: string[] = [];

        for await (const event of stream) {
          if (event.type === "delta") {
            fullContent += event.content;

            // Extract and send new thoughts
            const thoughts = extractThoughts(fullContent);
            const newThoughts = thoughts.filter(
              (t) => !lastSentThoughts.includes(t),
            );

            for (const thought of newThoughts) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "thought", thought })}\n\n`,
                ),
              );
              lastSentThoughts.push(thought);
            }
          } else if (event.type === "done") {
            // Parse final answer — try multiple strategies
            const answer = extractAnswer(fullContent);

            // Save assistant message
            await saveChatMessage(conversationId, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: answer,
              timestamp: new Date().toISOString(),
            });

            // Send answer event
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "answer", answer })}\n\n`,
              ),
            );

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } else if (event.type === "error") {
            const errorMessage = event.message || "Unknown streaming error";

            // Save error as assistant message
            await saveChatMessage(conversationId, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
              timestamp: new Date().toISOString(),
            });

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`,
              ),
            );
            controller.close();
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        try {
          await saveChatMessage(conversationId, {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Ignore save errors during error handling
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`,
          ),
        );
        try {
          controller.close();
        } catch {
          // Controller may already be closed
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
