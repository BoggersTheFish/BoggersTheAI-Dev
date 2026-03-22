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
import { boggersUrl, getBoggersHeaders } from "@/lib/boggersApi";
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

    const assistantMsgId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      },
    ]);

    try {
      const r = await fetch(boggersUrl("/query/stream"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...getBoggersHeaders(),
        },
        body: JSON.stringify({ query: text }),
        signal: AbortSignal.timeout(180000),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        throw new Error(errText || r.statusText || "Request failed");
      }
      const reader = r.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buf = "";
      let assistantContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        for (;;) {
          const sep = buf.indexOf("\n\n");
          if (sep < 0) break;
          const block = buf.slice(0, sep).trim();
          buf = buf.slice(sep + 2);
          if (!block.startsWith("data: ")) continue;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(block.slice(6)) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (ev.type === "token" && typeof ev.delta === "string") {
            assistantContent += ev.delta;
            setMessages((m) =>
              m.map((x) =>
                x.id === assistantMsgId ? { ...x, content: assistantContent } : x
              )
            );
          }
          if (ev.type === "error") {
            throw new Error(String(ev.message ?? "Stream error"));
          }
          if (ev.type === "done" && ev.ok) {
            const ans = String(ev.answer ?? "").trim();
            if (ans) {
              assistantContent = ans;
              setMessages((m) =>
                m.map((x) =>
                  x.id === assistantMsgId ? { ...x, content: ans } : x
                )
              );
            }
          }
        }
      }
      if (!assistantContent.trim()) {
        throw new Error("Empty response");
      }
      setGraphTick((t) => t + 1);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== assistantMsgId));
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

  const sidShort = sessionId ? `${sessionId.slice(0, 8)}…` : "—";

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-5 pb-8">
      <header className="ts-surface-panel mb-5 px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl border border-ts-purple/40 bg-ts-purple/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-ts-purple-light" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-lg font-semibold text-white tracking-tight">TS Chat</h1>
              <span className="ts-phase-pill !py-0.5 !text-[9px]">Surface</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              Session <span className="text-ts-purple-light/90">{sidShort}</span> — stream after graph phases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
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
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={clearChat}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
          <Button variant="default" size="sm" className="text-xs h-8" onClick={newChat}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New session
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-0 lg:min-h-[min(640px,calc(100dvh-12rem))]">
        {/* Substrate — graph completes before tokens (shown first on desktop) */}
        <aside
          className={cn(
            "order-2 lg:order-1 w-full lg:w-[min(100%,440px)] lg:max-w-[440px] shrink-0",
            "flex flex-col gap-3 lg:pr-5 lg:border-r lg:border-ts-purple/25"
          )}
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="ts-phase-pill !text-[9px]">
              <span className="h-1 w-1 rounded-full bg-ts-purple shadow-ts" />
              Substrate
            </span>
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
              graph · session · SSE
            </span>
          </div>
          <LiveGraphPanel
            refreshSignal={graphTick}
            sessionId={sessionId}
            className="flex-1 min-h-[280px] lg:min-h-[360px]"
          />
        </aside>

        {/* Surface — language */}
        <div className="order-1 lg:order-2 flex-1 min-w-0 flex flex-col min-h-0 lg:pl-6">
          <div className="ts-surface-panel flex flex-col flex-1 min-h-[min(520px,70vh)] lg:min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              {messages.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-ts-purple/15 bg-black/30 px-4 py-8 text-center"
                >
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    Messages run{" "}
                    <span className="text-ts-purple-light font-medium">after</span> the living graph
                    resolves context and exploration. What you read here is the language surface on top
                    of that fixed substrate — same order as{" "}
                    <code className="text-xs font-mono text-ts-purple/90">/query/stream</code>.
                  </p>
                </motion.div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} role={m.role} content={m.content} />
                ))}
              </AnimatePresence>
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm pl-1">
                  <Loader2 className="w-4 h-4 animate-spin text-ts-purple" />
                  <span className="font-mono text-xs">Streaming surface…</span>
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300/90">
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex-shrink-0 border-t border-ts-purple/20 p-3 sm:p-4 bg-black/40">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Write to the surface… (Enter send, Shift+Enter newline)"
                rows={3}
                disabled={loading}
                className={cn(
                  "w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground rounded-lg",
                  "placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-ts-purple/35",
                  "min-h-[80px] max-h-[200px]"
                )}
              />
              <div className="flex justify-end mt-2">
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
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[min(100%,44rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-ts-purple/18 border border-ts-purple/40 text-foreground ml-6 sm:ml-10"
            : "bg-[#0a0a0a] border border-ts-purple/25 text-zinc-100 mr-6 sm:mr-8"
        )}
      >
        <div className="whitespace-pre-wrap break-words pr-5">{content}</div>
        <div
          className={cn(
            "flex justify-end mt-2 pt-2 border-t",
            isUser ? "border-ts-purple/25" : "border-white/5"
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
