"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  Circle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { boggersUrl, getSessionHeaders } from "@/lib/boggersApi";
import {
  getChatSessionId,
  startNewChatSession,
  chatTranscriptKey,
} from "@/lib/chatSession";
import { cn } from "@/lib/utils";
import { LiveGraphPanel } from "@/components/chat/LiveGraphPanel";

type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

function loadTranscript(sid: string): ChatMessage[] {
  if (typeof window === "undefined" || !sid) return [];
  try {
    const raw = localStorage.getItem(chatTranscriptKey(sid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as ChatMessage).id === "string" &&
        typeof (m as ChatMessage).content === "string"
    );
  } catch {
    return [];
  }
}

function saveTranscript(sid: string, messages: ChatMessage[]) {
  if (typeof window === "undefined" || !sid) return;
  try {
    localStorage.setItem(chatTranscriptKey(sid), JSON.stringify(messages));
  } catch {
    /* ignore quota */
  }
}

export function ChatWorkspace() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [graphTick, setGraphTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const sid = getChatSessionId();
    setSessionId(sid);
    setMessages(loadTranscript(sid));
  }, []);

  useEffect(() => {
    if (sessionId) saveTranscript(sessionId, messages);
  }, [sessionId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const checkBackend = useCallback(async () => {
    try {
      const r = await fetch(boggersUrl("/health/live"), {
        signal: AbortSignal.timeout(5000),
      });
      setBackendOk(r.ok);
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    checkBackend();
    const t = setInterval(checkBackend, 20000);
    return () => clearInterval(t);
  }, [checkBackend]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const r = await fetch(boggersUrl("/query"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSessionHeaders(),
        },
        body: JSON.stringify({ query: text }),
        signal: AbortSignal.timeout(180000),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          (data as { detail?: string }).detail || r.statusText || "Request failed"
        );
      }
      if (!(data as { ok?: boolean }).ok) {
        throw new Error((data as { error?: string }).error || "Query failed");
      }
      const answer = String((data as { answer?: string }).answer ?? "").trim();
      if (!answer) throw new Error("Empty response");
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, assistantMsg]);
      setGraphTick((t) => t + 1);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not reach the backend. Run `docker compose up` and ensure BOGGERS_DASHBOARD_TOKEN matches.";
      setError(msg);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const newChat = () => {
    const sid = startNewChatSession();
    if (sid) setSessionId(sid);
    setMessages([]);
    setError("");
    textareaRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([]);
    if (sessionId) {
      try {
        localStorage.removeItem(chatTranscriptKey(sessionId));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-3 sm:px-4 pb-4">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 py-4 border-b border-ts-purple/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-ts-purple/40 bg-ts-purple/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-ts-purple-light" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              TS Chat
            </h1>
            <p className="text-[11px] text-muted-foreground font-mono">
              Graph-decomposed retrieval · wave exploration · local LLM synthesis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => checkBackend()}
            className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {backendOk === null ? (
              <span className="opacity-50">Checking…</span>
            ) : backendOk ? (
              <>
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                Backend live
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-orange-400" />
                Offline
              </>
            )}
          </button>
          <Button variant="outline" size="sm" className="text-xs" onClick={clearChat}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
          <Button variant="default" size="sm" className="text-xs" onClick={newChat}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New chat
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0 min-w-0 lg:max-w-[min(100%,36rem)]">
      {/* Messages */}
      <div className="flex-1 min-h-[240px] lg:min-h-0 max-h-[min(55vh,420px)] lg:max-h-none lg:flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-4"
          >
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Ask anything. Each message runs through the TS-OS pipeline: the model
              breaks your text into concepts, the living graph retrieves and explores
              them, then Ollama synthesizes the answer—grounded in your session’s
              graph memory.
            </p>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm pl-2">
            <Loader2 className="w-4 h-4 animate-spin text-ts-purple" />
            <span className="font-mono text-xs">Thinking…</span>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300/90">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 pt-2 border-t border-ts-purple/15">
        <div className="rounded-xl border border-ts-purple/25 bg-black/60 backdrop-blur-sm p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message TS-OS… (Enter send, Shift+Enter newline)"
            rows={3}
            disabled={loading}
            className={cn(
              "w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground/40 focus:outline-none",
              "min-h-[80px] max-h-[200px]"
            )}
          />
          <div className="flex justify-end px-2 pb-1">
            <Button
              type="button"
              size="sm"
              disabled={loading || !input.trim()}
              onClick={send}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      </div>
        </div>

        <aside className="w-full lg:w-[min(100%,440px)] lg:flex-shrink-0 flex flex-col min-h-[300px] lg:min-h-[min(560px,calc(100vh-10rem))] lg:sticky lg:top-20 lg:self-start">
          <LiveGraphPanel refreshSignal={graphTick} className="flex-1 min-h-[280px] lg:min-h-0" />
        </aside>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: Role; content: string }) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-ts-purple/20 border border-ts-purple/35 text-foreground ml-8"
            : "bg-zinc-900/90 border border-ts-purple/20 text-zinc-100 mr-8"
        )}
      >
        <div className="whitespace-pre-wrap break-words pr-6">{content}</div>
        <div
          className={cn(
            "flex justify-end mt-2 pt-2 border-t",
            isUser ? "border-ts-purple/20" : "border-white/5"
          )}
        >
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
