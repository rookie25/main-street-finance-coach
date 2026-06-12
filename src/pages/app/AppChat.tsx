// Client Portal — Conversational AI (Component 4).
// Chat interface backed by POST /client/chat which injects Mark's live
// financial data into Claude's system prompt. History is session-only.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { sendChat, streamChat, getMe, ApiError } from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const STARTER_QUESTIONS = [
  "What was my best week this month?",
  "Which vendor am I spending the most on?",
  "Am I on track compared to last month?",
  "What are my biggest expense categories?",
];

const EXAMPLE_QUESTIONS = [
  "What did I spend on Craver in May?",
  "What was my best selling item?",
  "How much did I make last Tuesday?",
  "What are my top expenses this month?",
  "How does May compare to April?",
  "What's my busiest hour of the day?",
  "What will I make this month?",
  "Am I on track to hit $20k in June?",
  "Predict my end of month revenue",
  "How much should I set aside for taxes?",
  "When is my next quarterly tax payment?",
  "What's my estimated tax bill so far?",
];

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
  useEffect(() => {
    if (!selectedMonth || !schema) return;
    try {
      const saved = localStorage.getItem(keyFor(selectedMonth));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setIsRestored(true);
          return;
        }
      }
    } catch { /* ignore corrupt data */ }
    setMessages([]);
    setIsRestored(false);
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
    if (selectedMonth && schema) localStorage.removeItem(keyFor(selectedMonth));
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
      try {
        await streamChat(apiMessages, selectedMonth, (chunk) => {
          acc += chunk;
          setMessages([...nextMessages, { role: "assistant", content: acc }]);
        });
        if (!acc.trim()) {
          const resp = await sendChat(apiMessages, selectedMonth);
          setMessages([...nextMessages, { role: "assistant", content: resp.reply }]);
        }
      } catch (streamErr) {
        if (streamErr instanceof ApiError && streamErr.status === 429) throw streamErr;
        const resp = await sendChat(apiMessages, selectedMonth);
        setMessages([...nextMessages, { role: "assistant", content: resp.reply }]);
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
              {STARTER_QUESTIONS.map((q) => (
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
            {EXAMPLE_QUESTIONS.map((q) => (
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
