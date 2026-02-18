import { NextRequest } from "next/server";
import { Subconscious } from "subconscious";
import { buildChatTools } from "@/lib/chat-tools";
import { buildSystemPrompt, CHAT_ENGINE, extractThoughts } from "@/lib/chat-config";
import { getChatMessages, saveChatMessage } from "@/lib/chat-storage";

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
            // Parse final answer
            let answer = "";
            try {
              const final = JSON.parse(fullContent);
              answer =
                typeof final.answer === "string"
                  ? final.answer
                  : JSON.stringify(final.answer);
            } catch {
              // Fallback: try to extract answer field with regex
              const answerMatch = fullContent.match(
                /"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/,
              );
              if (answerMatch) {
                answer = answerMatch[1]
                  .replace(/\\n/g, "\n")
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, "\\");
              } else {
                answer = fullContent || "I processed your request. Check the dashboard for updates.";
              }
            }

            // Extract just the Final Answer if the response has that format
            const finalAnswerMatch = answer.match(/(?:Final Answer|final_answer):\s*([\s\S]*)/i);
            if (finalAnswerMatch) {
              answer = finalAnswerMatch[1].trim();
            }

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
