// Client Portal — Conversational AI (Component 4).
// Chat interface backed by POST /client/chat which injects Mark's live
// financial data into Claude's system prompt. History is session-only.
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { sendChat } from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_QUESTIONS = [
  "What was my best week this month?",
  "Which vendor am I spending the most on?",
  "Am I on track compared to last month?",
  "What are my biggest expense categories?",
];

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
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const resp = await sendChat(nextMessages);
      setMessages([...nextMessages, { role: "assistant", content: resp.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.");
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
        {messages.map((m, i) => (
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
        ))}

        {/* Typing indicator */}
        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────── */}
      <div className="border-t border-border bg-background px-4 py-3">
        {messages.length > 0 && (
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
            placeholder="Ask about your revenue, expenses, cash…"
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
