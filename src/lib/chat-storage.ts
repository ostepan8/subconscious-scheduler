import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export async function getChatMessages(conversationId: string): Promise<ChatMessage[]> {
  const docs = await convex.query(api.messages.listByConversation, { conversationId });
  return docs.map((d) => ({
    id: d.messageId,
    role: d.role as "user" | "assistant",
    content: d.content,
    timestamp: d.timestamp,
  }));
}

export async function saveChatMessage(conversationId: string, message: ChatMessage): Promise<void> {
  await convex.mutation(api.messages.save, {
    conversationId,
    messageId: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
  });
}

export async function clearChatMessages(conversationId: string): Promise<void> {
  await convex.mutation(api.messages.clear, { conversationId });
}
