"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useChat, type Conversation } from "@/hooks/useChat";
import { useTourState } from "@/hooks/useTourState";
import ProductTour from "@/components/tour/ProductTour";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import ThinkingIndicator from "@/components/chat/ThinkingIndicator";
import AskQuestionCard from "@/components/chat/AskQuestionCard";
import {
  MessageSquare,
  Trash2,
  ChevronRight,
  Plus,
  MessageCircle,
  MessagesSquare,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function groupByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const week = today - 7 * 86400000;

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const c of conversations) {
    const t = new Date(c.updatedAt).getTime();
    if (t >= today) groups[0].items.push(c);
    else if (t >= yesterday) groups[1].items.push(c);
    else if (t >= week) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

// ── Conversation row ─────────────────────────────────────

function ConversationRow({
  conversation,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface cursor-pointer"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted group-hover:bg-edge group-hover:text-cream">
        <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cream truncate">{conversation.title}</p>
        <p className="text-[11px] text-muted">{timeAgo(conversation.updatedAt)}</p>
      </div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 rounded p-1 opacity-0 text-muted transition-all group-hover:opacity-100 hover:text-danger hover:bg-danger/10 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
    </button>
  );
}

// ── Conversations list view ──────────────────────────────

function ConversationListView({
  conversations,
  isLoading,
  onSelect,
  onNewAgent,
  onDelete,
  onCollapse,
}: {
  conversations: Conversation[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNewAgent: () => void;
  onDelete: (id: string) => void;
  onCollapse: () => void;
}) {
  const groups = groupByDate(conversations);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <span className="text-sm font-semibold text-cream">Chats</span>
        <button
          onClick={onCollapse}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-cream cursor-pointer"
          title="Hide panel"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* New Agent button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onNewAgent}
          className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-edge bg-surface/50 px-4 py-3 text-left transition-all hover:border-brand/40 hover:bg-surface cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Plus className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-medium text-cream">New Email</p>
            <p className="text-[11px] text-muted">Set up a new personalized email</p>
          </div>
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="space-y-2 px-1 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-surface" />
                <div className="flex-1 min-w-0">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-surface" />
                  <div className="mt-1.5 h-2.5 w-14 animate-pulse rounded bg-surface/60" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface">
              <MessagesSquare className="h-5 w-5 text-muted" strokeWidth={1.75} />
            </div>
            <p className="text-xs text-muted">No conversations yet</p>
            <p className="mt-1 text-[11px] text-muted/60">Click &quot;New Email&quot; to start</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted/60">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((convo) => (
                    <ConversationRow
                      key={convo.id}
                      conversation={convo}
                      onSelect={() => onSelect(convo.id)}
                      onDelete={() => onDelete(convo.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active chat view ─────────────────────────────────────

const SUGGESTIONS = [
  "Show my tasks",
  "Create a research task",
  "What's running?",
];

function ActiveChatView({
  messages,
  isThinking,
  isLoadingMessages,
  thoughts,
  sendMessage,
  messagesEndRef,
  activeConversation,
  activeConversationId,
  onBack,
  onCollapse,
  onRename,
}: {
  messages: { id: string; role: "user" | "assistant"; content: string; timestamp: Date }[];
  isThinking: boolean;
  isLoadingMessages: boolean;
  thoughts: string[];
  sendMessage: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  activeConversation: Conversation | undefined;
  activeConversationId: string | null;
  onBack: () => void;
  onCollapse: () => void;
  onRename: (title: string) => void;
}) {
  const pendingQuestion = useQuery(
    api.pendingQuestions.getForConversation,
    activeConversationId ? { conversationId: activeConversationId } : "skip",
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(activeConversation?.title ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(activeConversation?.title ?? "");
  }, [activeConversation?.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmitRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== activeConversation?.title) {
      onRename(trimmed);
    } else {
      setEditTitle(activeConversation?.title ?? "");
    }
    setIsEditing(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-edge px-3 py-3">
        <button
          onClick={onBack}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-cream cursor-pointer"
          title="Back to conversations"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>

        {/* Editable title */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSubmitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitRename();
                if (e.key === "Escape") {
                  setEditTitle(activeConversation?.title ?? "");
                  setIsEditing(false);
                }
              }}
              className="w-full bg-transparent text-sm font-medium text-cream outline-none border-b border-brand pb-0.5"
            />
          ) : (
            <p
              onClick={() => setIsEditing(true)}
              className="truncate text-sm font-medium text-cream cursor-pointer hover:text-brand transition-colors"
              title="Click to rename"
            >
              {activeConversation?.title ?? "Chat"}
            </p>
          )}
        </div>

        <button
          onClick={onCollapse}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-cream cursor-pointer"
          title="Hide panel"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {/* Loading messages skeleton */}
          {isLoadingMessages && (
            <div className="space-y-3">
              {/* Skeleton user message */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand/20 px-4 py-3">
                  <div className="h-3 w-32 animate-pulse rounded bg-brand/20" />
                  <div className="mt-1.5 h-2 w-10 animate-pulse rounded bg-brand/10" />
                </div>
              </div>
              {/* Skeleton assistant message */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-edge bg-surface px-4 py-3">
                  <div className="space-y-2">
                    <div className="h-3 w-48 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-40 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-28 animate-pulse rounded bg-surface-hover" />
                  </div>
                  <div className="mt-1.5 h-2 w-10 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
              {/* Skeleton user message */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand/20 px-4 py-3">
                  <div className="h-3 w-44 animate-pulse rounded bg-brand/20" />
                  <div className="mt-1.5 h-2 w-10 animate-pulse rounded bg-brand/10" />
                </div>
              </div>
              {/* Skeleton assistant message */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-edge bg-surface px-4 py-3">
                  <div className="space-y-2">
                    <div className="h-3 w-52 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-36 animate-pulse rounded bg-surface-hover" />
                  </div>
                  <div className="mt-1.5 h-2 w-10 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 && !isThinking && !isLoadingMessages && (
            <div className="flex flex-col items-center pt-12 pb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
                <Sparkles className="h-6 w-6 text-brand" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-cream">What can I help with?</p>
              <p className="mt-1 text-center text-xs text-muted">
                Ask me to create tasks, check status, or research anything
              </p>
              <div className="mt-5 flex flex-col gap-2 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-left text-sm text-subtle transition-colors hover:border-brand/30 hover:text-cream cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isThinking && <ThinkingIndicator thoughts={thoughts} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Pending question card (blocking human-in-the-loop) */}
      {pendingQuestion && (
        <AskQuestionCard
          questionId={pendingQuestion._id}
          question={pendingQuestion.question}
          options={pendingQuestion.options}
        />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isThinking} />
    </div>
  );
}

// ── Main shell ───────────────────────────────────────────

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    messages,
    isThinking,
    isLoadingMessages,
    isLoadingConversations,
    thoughts,
    sendMessage,
    messagesEndRef,
    conversations,
    activeConversationId,
    switchConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    isChatOpen,
    toggleChat,
  } = useChat();

  const { shouldShowTour, isReady: tourReady, completeTour } = useTourState();

  // One-time migration: claim orphaned data for this user
  const claimOrphaned = useMutation(api.migrations.claimOrphanedData);
  const migrationRan = useRef(false);
  useEffect(() => {
    if (migrationRan.current) return;
    migrationRan.current = true;
    claimOrphaned().catch(() => {/* ignore */});
  }, [claimOrphaned]);

  // "list" = conversation list, "chat" = active conversation
  const [view, setView] = useState<"list" | "chat">("list");

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSelectConversation = (id: string) => {
    switchConversation(id);
    setView("chat");
  };

  const handleNewAgent = () => {
    createConversation();
    setView("chat");
  };

  const handleBack = () => {
    setView("list");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left — Dashboard content */}
      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* Floating open button when collapsed */}
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed right-4 bottom-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 hover:scale-105 cursor-pointer"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
        </button>
      )}

      {/* Right — Chat panel */}
      <div
        data-tour="chat-panel"
        className={`shrink-0 border-l border-edge bg-ink transition-all duration-300 ease-in-out overflow-hidden ${
          isChatOpen ? "w-[420px]" : "w-0 border-l-0"
        }`}
      >
        {view === "list" ? (
          <ConversationListView
            conversations={conversations}
            isLoading={isLoadingConversations}
            onSelect={handleSelectConversation}
            onNewAgent={handleNewAgent}
            onDelete={deleteConversation}
            onCollapse={toggleChat}
          />
        ) : (
          <ActiveChatView
            messages={messages}
            isThinking={isThinking}
            isLoadingMessages={isLoadingMessages}
            thoughts={thoughts}
            sendMessage={sendMessage}
            messagesEndRef={messagesEndRef}
            activeConversation={activeConversation}
            activeConversationId={activeConversationId}
            onBack={handleBack}
            onCollapse={toggleChat}
            onRename={(title) => {
              if (activeConversationId) renameConversation(activeConversationId, title);
            }}
          />
        )}
      </div>

      {/* Product tour for first-time users */}
      {tourReady && shouldShowTour && (
        <ProductTour
          onComplete={completeTour}
          isChatOpen={isChatOpen}
          toggleChat={toggleChat}
        />
      )}
    </div>
  );
}
