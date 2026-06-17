// Client Portal — Conversational AI (Component 4).
// Chat interface backed by POST /client/chat which injects Mark's live
// financial data into Claude's system prompt. History is session-only.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { sendChat, streamChat, getMe, getChatHistory, saveChatTurn, clearChatHistory, ApiError } from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// Suggested prompts adapt to the client's business type so they're relevant
// (a contractor shouldn't be asked about "best-selling drink"). Falls back to
// a neutral set that works for any business.
const PROMPTS: Record<string, { starters: string[]; examples: string[] }> = {
  food: {
    starters: [
      "What was my best week this month?",
      "Which vendor am I spending the most on?",
      "Am I on track compared to last month?",
      "What are my biggest expense categories?",
    ],
    examples: [
      "What was my best selling item?",
      "How much did I make last Tuesday?",
      "What's my busiest hour of the day?",
      "How does this month compare to last?",
      "What will I make this month?",
      "How much should I set aside for taxes?",
      "When is my next quarterly tax payment?",
      "What are my top expenses this month?",
    ],
  },
  construction: {
    starters: [
      "Which job is most profitable right now?",
      "How much have I billed versus collected?",
      "Which job is trending over budget?",
      "What are my biggest costs this month?",
    ],
    examples: [
      "Which job made the most money?",
      "What's my labor vs. material cost split?",
      "Which subcontractor am I paying the most?",
      "How does this month compare to last?",
      "What will I make this month?",
      "How much should I set aside for taxes?",
      "When is my next quarterly tax payment?",
      "What's my cash position right now?",
    ],
  },
  retail: {
    starters: [
      "What's my best-selling product?",
      "Which vendor am I spending the most on?",
      "Am I on track compared to last month?",
      "What are my biggest expense categories?",
    ],
    examples: [
      "What was my best selling product?",
      "How much did I make last week?",
      "How does this month compare to last?",
      "What are my top expenses this month?",
      "What will I make this month?",
      "How much should I set aside for taxes?",
      "When is my next quarterly tax payment?",
      "What's my cash position right now?",
    ],
  },
  default: {
    starters: [
      "How am I doing this month?",
      "What are my biggest expenses?",
      "How does this month compare to last?",
      "How much should I set aside for taxes?",
    ],
    examples: [
      "How much money did I make last week?",
      "What are my top expense categories?",
      "How does this month compare to last?",
      "Who are my biggest vendors?",
      "What will I make this month?",
      "When is my next quarterly tax payment?",
      "What's my cash position right now?",
      "What's my estimated tax bill so far?",
    ],
  },
};

function verticalFor(businessType?: string | null): keyof typeof PROMPTS {
  const t = (businessType || "").toLowerCase();
  if (/coffee|cafe|caf|bakery|restaurant|bar|food|grill|kitchen|brew|deli|pizz/.test(t)) return "food";
  if (/construct|contractor|build|trades|plumb|electric|hvac|roof|concrete|landscap/.test(t)) return "construction";
  if (/retail|shop|store|boutique|market/.test(t)) return "retail";
  return "default";
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppChat() {
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [isRestored,    setIsRestored]    = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const monthOptions = getMonthOptions();

  // Chat history is namespaced per client so it never collides across accounts
  // on a shared device. (For Groundstack this resolves to the original
  // "groundstack_chat_*" key, so existing history is preserved.)
  const { data: meData } = useQuery({ queryKey: ["client", "me"], queryFn: getMe, staleTime: 10 * 60 * 1000 });
  const schema = meData?.client_schema || "";
  const keyFor = (m: string) => `${schema}_chat_${m}`;
  const prompts = PROMPTS[verticalFor(meData?.business_type)];

  // Purge this client's chat keys older than 3 months (once schema is known).
  useEffect(() => {
    if (!schema) return;
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const cutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `${schema}_chat_`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => {
        const month = k.replace(prefix, "");
        if (month < cutoff) localStorage.removeItem(k);
      });
  }, [schema]);

  // Restore saved history when the month (or the resolved client) changes.
  // Server is the source of truth so chats sync across devices (web <-> app);
  // localStorage is only a fallback cache when the server has nothing / is down.
  useEffect(() => {
    if (!selectedMonth) return;   // NOTE: not gated on `schema` — the server load
    let cancelled = false;        // scopes by the JWT, so it must fire even before
    (async () => {                // getMe/schema resolves (that gate blocked sync).
      try {
        const { messages: serverMsgs } = await getChatHistory(selectedMonth);
        if (cancelled) return;
        if (serverMsgs && serverMsgs.length > 0) {
          setMessages(serverMsgs.map((m) => ({ role: m.role, content: m.content })));
          setIsRestored(true);
          return;
        }
      } catch { /* fall through to local cache */ }
      // localStorage fallback needs the schema for its namespaced key.
      if (schema) {
        try {
          const saved = localStorage.getItem(keyFor(selectedMonth));
          if (!cancelled && saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              setIsRestored(true);
              return;
            }
          }
        } catch { /* ignore corrupt data */ }
      }
      if (!cancelled) {
        setMessages([]);
        setIsRestored(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMonth, schema]);

  // Persist messages to localStorage (exclude system separators, cap at 50)
  useEffect(() => {
    if (!selectedMonth || !schema || messages.length === 0) return;
    try {
      const toSave = messages.filter((m) => m.role !== "system").slice(-50);
      localStorage.setItem(keyFor(selectedMonth), JSON.stringify(toSave));
    } catch { /* ignore storage errors */ }
  }, [messages, selectedMonth, schema]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleMonthChange(month: string) {
    setSelectedMonth(month);
    // Restore effect will load/clear history for the new month
  }

  function handleNewConversation() {
    if (selectedMonth && schema) {
      localStorage.removeItem(keyFor(selectedMonth));
      clearChatHistory(selectedMonth).catch(() => { /* non-blocking */ });
    }
    setMessages([]);
    setIsRestored(false);
    toast.success("Conversation cleared");
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setIsRestored(false);
    // Visible message — original text only
    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // API payload: strip system separators and prepend month context to the last user message
      const apiMessages = nextMessages
        .filter(m => m.role !== "system")
        .map((m, i, arr) =>
          m.role === "user" && i === arr.length - 1 && selectedMonth
            ? { ...m, content: `[Context: User is asking about ${fmtMonth(selectedMonth)}] ${m.content}` }
            : m,
        );
      // Stream tokens live; fall back to the non-streaming endpoint on any error.
      let acc = "";
      let assistantReply = "";
      try {
        await streamChat(apiMessages, selectedMonth, (chunk) => {
          acc += chunk;
          setMessages([...nextMessages, { role: "assistant", content: acc }]);
        });
        if (!acc.trim()) {
          const resp = await sendChat(apiMessages, selectedMonth);
          assistantReply = resp.reply;
          setMessages([...nextMessages, { role: "assistant", content: resp.reply }]);
        } else {
          assistantReply = acc;
        }
      } catch (streamErr) {
        if (streamErr instanceof ApiError && streamErr.status === 429) throw streamErr;
        const resp = await sendChat(apiMessages, selectedMonth);
        assistantReply = resp.reply;
        setMessages([...nextMessages, { role: "assistant", content: resp.reply }]);
      }
      // Persist the completed turn server-side so it syncs across devices
      // (best-effort; store the clean user text, not the context-prefixed version).
      if (assistantReply.trim()) {
        saveChatTurn(selectedMonth, [
          { role: "user", content: trimmed },
          { role: "assistant", content: assistantReply },
        ]).catch(() => { /* non-blocking */ });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        toast.warning("Slow down a little — try again in a minute");
      } else {
        toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
      // Remove the user message so they can retry
      setMessages(messages);
    } finally {
      setLoading(false);
      // Refocus input on mobile after response arrives
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter (without Shift) on desktop; Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      submit(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-8.5rem)]">
      {/* ── Restored banner ────────────────────────────────────── */}
      {isRestored && !isEmpty && selectedMonth && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#F8FAFC] border-b border-border">
          <span className="text-[11px] text-[#94A3B8]">
            Continuing your {fmtMonth(selectedMonth)} conversation
          </span>
          <button
            onClick={handleNewConversation}
            className="text-[11px] text-[#6366F1] hover:underline underline-offset-2"
          >
            New conversation
          </button>
        </div>
      )}

      {/* ── Message list ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Empty state with starter questions */}
        {isEmpty && !loading && (
          <div className="space-y-6 pt-4">
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold text-primary">Ask about your books</h2>
              <p className="text-sm text-muted-foreground mt-1">
                I have your real numbers — ask me anything.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {prompts.starters.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="text-left text-sm bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => {
          if (m.role === "system") {
            return (
              <div key={i} className="flex items-center justify-center py-1">
                <span className="text-xs text-muted-foreground italic">{m.content}</span>
              </div>
            );
          }
          return (
            <div
              key={i}
              className={cn("flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm",
                )}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {/* Typing indicator — only until the streaming assistant bubble appears */}
        {loading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* ── Month picker ───────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-border bg-background flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">Asking about:</span>
        <select
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background flex-1 min-w-0"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── Example questions ──────────────────────────────────── */}
      {isEmpty && !loading && !input && (
        <div className="px-4 pb-2 border-t border-border bg-background">
          <p className="text-[11px] text-muted-foreground mt-2 mb-1">Try asking:</p>
          <ul className="space-y-0.5">
            {prompts.examples.map((q) => (
              <li key={q} className="text-[11px] text-muted-foreground">• {q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Input area ─────────────────────────────────────────── */}
      <div className="border-t border-border bg-background px-4 py-3">
        {messages.filter((m) => m.role !== "system").length > 0 && (
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> New conversation
          </button>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your revenue, expenses, vendors…"
            rows={1}
            className="resize-none min-h-[2.75rem] max-h-32 flex-1 text-sm py-2.5"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => submit(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 h-11 w-11 rounded-xl"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Uses your real bookkeeping data · History saved per month
        </p>
      </div>
    </div>
  );
}
