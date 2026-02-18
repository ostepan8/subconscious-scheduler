"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingConversationRef = useRef<string | null>(null);

  // Real-time conversation list from Convex
  const rawConversations = useQuery(api.conversations.list);
  const isLoadingConversations = rawConversations === undefined;
  const convexConversations = rawConversations ?? [];
  const createConvexConversation = useMutation(api.conversations.create);
  const renameConvexConversation = useMutation(api.conversations.rename);
  const removeConvexConversation = useMutation(api.conversations.remove);

  // Map Convex docs to the Conversation interface
  const conversations: Conversation[] = convexConversations.map((c) => ({
    id: c.externalId,
    title: c.title,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  }));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  // Load messages for a specific conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(
            data.map((m: { id: string; role: "user" | "assistant"; content: string; timestamp: string }) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          );
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          }, 100);
        }
      } catch {
        // Ignore load errors
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [],
  );

  const switchConversation = useCallback(
    async (id: string) => {
      if (id === activeConversationId) return;
      pendingConversationRef.current = null;
      setActiveConversationId(id);
      setMessages([]);
      setThoughts([]);
      await loadMessages(id);
    },
    [activeConversationId, loadMessages],
  );

  // Set up a draft conversation without persisting to the database.
  // The conversation is created in Convex only when the first message is sent.
  const createConversation = useCallback(() => {
    const externalId = crypto.randomUUID();
    pendingConversationRef.current = externalId;
    setActiveConversationId(externalId);
    setMessages([]);
    setThoughts([]);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        // Delete from Convex (messages are cleaned up automatically)
        await removeConvexConversation({ externalId: id });

        if (id === activeConversationId) {
          const remaining = conversations.filter((c) => c.id !== id);
          if (remaining.length > 0) {
            setActiveConversationId(remaining[0].id);
            loadMessages(remaining[0].id);
          } else {
            setActiveConversationId(null);
            setMessages([]);
          }
        }
      } catch {
        // Ignore delete errors
      }
    },
    [activeConversationId, conversations, removeConvexConversation, loadMessages],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await renameConvexConversation({ externalId: id, title });
    },
    [renameConvexConversation],
  );

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking || !activeConversationId) return;

      // If this is a pending (draft) conversation, persist it now
      if (pendingConversationRef.current === activeConversationId) {
        await createConvexConversation({ externalId: activeConversationId });
        pendingConversationRef.current = null;
      }

      // Add user message optimistically
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);
      setThoughts([]);
      scrollToBottom();

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, conversationId: activeConversationId }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);

            if (payload === "[DONE]") continue;

            try {
              const data = JSON.parse(payload) as {
                type: string;
                thought?: string;
                answer?: string;
                message?: string;
              };

              if (data.type === "thought" && data.thought) {
                setThoughts((prev) => [...prev, data.thought!]);
                scrollToBottom();
              } else if (data.type === "answer" && data.answer) {
                const assistantMsg: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: data.answer,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                scrollToBottom();
              } else if (data.type === "error") {
                const errorMsg: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: `Error: ${data.message || "Something went wrong"}`,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMsg]);
                scrollToBottom();
              }
            } catch {
              // Ignore unparseable lines
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          // Stream was cancelled
        } else {
          const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, something went wrong. Please try again.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          scrollToBottom();
        }
      } finally {
        setIsThinking(false);
        setThoughts([]);
        abortRef.current = null;
        scrollToBottom();
      }
    },
    [isThinking, activeConversationId, scrollToBottom, createConvexConversation],
  );

  const clearHistory = useCallback(async () => {
    if (!activeConversationId) return;
    await fetch("/api/chat/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConversationId }),
    });
    setMessages([]);
  }, [activeConversationId]);

  return {
    messages,
    isThinking,
    isLoadingMessages,
    isLoadingConversations,
    thoughts,
    sendMessage,
    clearHistory,
    messagesEndRef,
    conversations,
    activeConversationId,
    switchConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    isChatOpen,
    toggleChat,
  };
}
