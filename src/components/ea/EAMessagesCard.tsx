// EA Portal — per-client messaging card. Displayed in EAClient right sidebar.
// EA bubbles right/green, client bubbles left/grey. Realtime subscription per schema.
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { safeChannel, safeRemoveChannel } from "@/lib/realtime";
import {
  eaGetMessages, eaSendMessage,
  type Message,
} from "@/lib/messagesApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface Props {
  schema: string;
}

export default function EAMessagesCard({ schema }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [input,    setInput]    = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setMessages([]);
    (async () => {
      try {
        const res = await eaGetMessages(schema);
        if (!mounted) return;
        setMessages(res.messages);
      } catch (err) {
        if (mounted) toast.error(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [schema]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  useEffect(() => {
    if (!schema) return;
    const channel = safeChannel(() =>
      supabase
        .channel(`messages:ea:${schema}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `client_schema=eq.${schema}` },
          (payload) => {
            const msg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          },
        )
        .subscribe(),
    );
    return () => { safeRemoveChannel(channel); };
  }, [schema]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      const msg = await eaSendMessage(schema, text);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
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
      handleSend();
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Message list — fixed height, scrollable */}
        <div className="h-72 overflow-y-auto px-4 py-2 space-y-1 border-t border-border">
          {loading ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
              <p className="text-sm text-muted-foreground">No messages yet.</p>
              <p className="text-xs text-muted-foreground">Send a message to the client below.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isEA = msg.sender_role === "ea";
              return (
                <div key={msg.id} className={cn("flex mb-2", isEA ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2",
                      isEA
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm",
                    )}
                  >
                    <p className="text-xs whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={cn("text-[9px] mt-0.5", isEA ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message client…"
              className="resize-none min-h-[36px] max-h-[100px] text-xs"
              rows={1}
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="shrink-0 h-9 w-9"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
