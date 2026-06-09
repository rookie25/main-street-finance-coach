// Client Portal — Conversational AI (Component 4).
// Chat interface backed by POST /client/chat which injects Mark's live
// financial data into Claude's system prompt. History is session-only.
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendChat, getReports, ApiError } from "@/lib/clientApi";
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
];

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const { data: reportsData, isLoading: monthsLoading } = useQuery({
    queryKey: ["client", "reports"],
    queryFn: () => getReports(),
    staleTime: 5 * 60 * 1000,
  });

  const months = reportsData?.available_months ?? [];

  // Default to most recent month once data loads
  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleMonthChange(month: string) {
    setSelectedMonth(month);
    setMessages(prev => [
      ...prev,
      { role: "system", content: `Switched to ${fmtMonth(month)} →` },
    ]);
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

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
      const resp = await sendChat(apiMessages);
      setMessages([...nextMessages, { role: "assistant", content: resp.reply }]);
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

        {/* Typing indicator */}
        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* ── Month picker ───────────────────────────────────────── */}
      {(monthsLoading || months.length > 0) && (
        <div className="px-4 py-2 border-t border-border bg-background flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground shrink-0">Asking about:</span>
          {monthsLoading ? (
            <select
              disabled
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-muted-foreground flex-1 min-w-0"
            >
              <option>Loading months…</option>
            </select>
          ) : (
            <select
              value={selectedMonth ?? ""}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background flex-1 min-w-0"
            >
              {months.map((m) => (
                <option key={m} value={m}>{fmtMonth(m)}</option>
              ))}
            </select>
          )}
        </div>
      )}

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
            onClick={() => setMessages([])}
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
          Uses your real bookkeeping data · Conversation resets on refresh
        </p>
      </div>
    </div>
  );
}
