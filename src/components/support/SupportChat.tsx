// Shared tech-support chat panel used by both the client (/app/support) and EA
// (/ea/support) portals. WhatsApp-style: the user's bubbles right, Desired Labs
// support bubbles left. Polls on open + every 20s (support_messages is backend-
// mediated, so there's no Supabase Realtime channel here).
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SupportMessage, SupportResponse } from "@/lib/supportApi";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

interface Props {
  load: () => Promise<SupportResponse>;
  send: (body: string) => Promise<SupportMessage>;
  embedded?: boolean;
}

export default function SupportChat({ load, send, embedded = false }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [input,    setInput]    = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  async function refresh(initial = false) {
    try {
      const res = await load();
      setMessages(res.messages);
    } catch (err) {
      if (initial) toast.error(err instanceof Error ? err.message : "Could not load support chat.");
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(true);
    const t = setInterval(() => void refresh(false), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      const msg = await send(text);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      // The backend posts an instant auto-acknowledgement; refetch now so it shows
      // immediately instead of waiting for the 20s poll.
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const grouped: { day: string; msgs: SupportMessage[] }[] = [];
  for (const msg of messages) {
    const day = formatDay(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last?.day === day) last.msgs.push(msg);
    else grouped.push({ day, msgs: [msg] });
  }

  return (
    <div className={embedded ? "flex flex-col h-full" : "flex flex-col h-[calc(100vh-8rem)]"}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
            <LifeBuoy className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Desired Labs Support</div>
            <div className="text-[11px] text-muted-foreground">We usually reply within one business day</div>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex justify-center pt-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
              <LifeBuoy className="h-7 w-7 text-accent" />
            </div>
            <div>
              <div className="font-medium text-foreground">How can we help?</div>
              <div className="text-sm text-muted-foreground mt-1">
                Send a message and the Desired Labs team will get back to you.
              </div>
            </div>
          </div>
        ) : (
          grouped.map(({ day, msgs }) => (
            <div key={day}>
              <DaySeparator label={day} />
              {msgs.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={msg.id} className={cn("flex mb-2", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5",
                        isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border text-foreground rounded-bl-sm",
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={cn("text-[10px] mt-1", isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your question or issue…"
            className="resize-none min-h-[40px] max-h-[120px] text-sm"
            rows={1}
            disabled={sending}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending} className="shrink-0 h-10 w-10">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
