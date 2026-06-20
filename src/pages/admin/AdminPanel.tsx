import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BASE = (import.meta.env.VITE_RAILWAY_URL as string | undefined)?.replace(/\/$/, "") ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  name: string;
  business_name: string;
  business_type: string;
  monthly_revenue: string;
  bookkeeping_spend: string;
  is_cpa_partner: boolean;
  status: "new" | "contacted" | "qualified" | "closed";
  message?: string;
  created_at: string;
}

interface Client {
  business_name: string | null;
  schema_name: string;
  onboarding_status: string | null;
  is_active: boolean;
  monthly_fee: number | null;
  square_connected: boolean;
  created_at: string;
}

interface SupportThread {
  portal:        "client" | "ea";
  user_id:       string;
  client_schema: string | null;
  user_email:    string | null;
  user_label:    string | null;
  last_body:     string;
  last_at:       string | null;
  unread:        number;
  total:         number;
}

interface SupportMsg {
  id:         string;
  sender:     "user" | "support";
  body:       string;
  created_at: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, key: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": key,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function toSchema(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  new:       "bg-amber-100 text-amber-800 border-amber-200",
  contacted: "bg-blue-100 text-blue-800 border-blue-200",
  qualified: "bg-green-100 text-green-800 border-green-200",
  closed:    "bg-slate-100 text-slate-600 border-slate-200",
};

function LeadStatusSelect({ lead, adminKey, onChange }: {
  lead: Lead;
  adminKey: string;
  onChange: (id: number, status: string) => void;
}) {
  async function update(status: string) {
    try {
      await apiFetch(`/admin/leads/${lead.id}/status`, adminKey, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onChange(lead.id, status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  return (
    <select
      value={lead.status}
      onChange={(e) => update(e.target.value)}
      className="text-xs rounded-md border border-border bg-background px-1.5 py-0.5 focus:outline-none"
    >
      {["new", "contacted", "qualified", "closed"].map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

// ── Send Onboarding Modal ─────────────────────────────────────────────────────

interface ModalProps {
  lead: Lead | null;
  onClose: () => void;
  adminKey: string;
  onSent: (leadId: number) => void;
}

function SendOnboardingModal({ lead, onClose, adminKey, onSent }: ModalProps) {
  const [email,      setEmail]      = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [setupFee,   setSetupFee]   = useState("750");
  const [schema,     setSchema]     = useState("");
  const [sending,    setSending]    = useState(false);
  const [result,     setResult]     = useState<{ link: string } | null>(null);

  useEffect(() => {
    if (lead) {
      setSchema(toSchema(lead.business_name));
      setEmail("");
      setMonthlyFee("");
      setSetupFee("750");
      setResult(null);
    }
  }, [lead]);

  const total = (Number(monthlyFee) || 0) + (Number(setupFee) || 0);

  async function handleSend() {
    if (!lead) return;
    if (!email.trim() || !monthlyFee || !schema.trim()) {
      toast.error("Email, monthly fee, and schema are required.");
      return;
    }
    setSending(true);
    try {
      const data = await apiFetch<{ link: string }>("/admin/send-onboarding", adminKey, {
        method: "POST",
        body: JSON.stringify({
          email:         email.trim(),
          name:          lead.name,
          business_name: lead.business_name,
          client_schema: schema.trim(),
          monthly_fee:   Number(monthlyFee),
          setup_fee:     Number(setupFee) || 750,
        }),
      });
      setResult(data);
      onSent(lead.id);
      toast.success("Onboarding link sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send link.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!lead} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send onboarding link</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium text-green-700">Link sent successfully!</p>
            <div className="bg-secondary rounded-xl p-3 break-all">
              <p className="text-xs text-muted-foreground mb-1">Onboarding link</p>
              <a
                href={result.link}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                {result.link}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
            <Button className="w-full" variant="outline" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary rounded-xl text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{lead?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Business</p>
                <p className="font-medium">{lead?.business_name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Client email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monthly fee ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  placeholder="299"
                />
              </div>
              <div className="space-y-2">
                <Label>Setup fee ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={setupFee}
                  onChange={(e) => setSetupFee(e.target.value)}
                  placeholder="750"
                />
              </div>
            </div>

            {total > 0 && (
              <p className="text-sm text-muted-foreground">
                Total charged: <span className="font-semibold text-foreground">${total.toLocaleString()}</span>
              </p>
            )}

            <div className="space-y-2">
              <Label>Client schema</Label>
              <Input
                value={schema}
                onChange={(e) => setSchema(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="main_street_coffee"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase + underscores only — used as the DB schema identifier.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSend} disabled={sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Leads table ───────────────────────────────────────────────────────────────

function LeadsTable({ leads, adminKey, onStatusChange, onSendLink }: {
  leads: Lead[];
  adminKey: string;
  onStatusChange: (id: number, status: string) => void;
  onSendLink: (lead: Lead) => void;
}) {
  if (!leads.length) {
    return <p className="text-sm text-muted-foreground py-4">No leads yet.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Name</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Business</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Revenue</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden lg:table-cell">CPA?</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Status</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
            <th className="py-2 px-2" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
              <td className="py-2.5 px-2 font-medium">{lead.name}</td>
              <td className="py-2.5 px-2">
                <div>{lead.business_name}</div>
                <div className="text-xs text-muted-foreground">{lead.business_type}</div>
              </td>
              <td className="py-2.5 px-2 hidden md:table-cell text-muted-foreground text-xs">
                {lead.monthly_revenue || "—"}
              </td>
              <td className="py-2.5 px-2 hidden lg:table-cell text-muted-foreground text-xs">
                {lead.is_cpa_partner ? "Yes" : "No"}
              </td>
              <td className="py-2.5 px-2">
                <LeadStatusSelect lead={lead} adminKey={adminKey} onChange={onStatusChange} />
              </td>
              <td className="py-2.5 px-2 hidden sm:table-cell text-xs text-muted-foreground">
                {lead.created_at?.slice(0, 10) ?? "—"}
              </td>
              <td className="py-2.5 px-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 whitespace-nowrap"
                  onClick={() => onSendLink(lead)}
                >
                  Send link
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Clients table ─────────────────────────────────────────────────────────────

// ── Payment-link modal ─────────────────────────────────────────────────────────
function PaymentLinkModal({ client, onClose, adminKey }: {
  client: Client | null;
  onClose: () => void;
  adminKey: string;
}) {
  const [price, setPrice] = useState("");
  const [busy,  setBusy]  = useState(false);
  const [link,  setLink]  = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setPrice(client.monthly_fee != null ? String(client.monthly_fee) : "");
      setLink(null);
    }
  }, [client]);

  async function generate() {
    if (!client) return;
    const dollars = Number(price);
    if (!dollars || dollars <= 0) { toast.error("Enter a monthly price."); return; }
    setBusy(true);
    try {
      const data = await apiFetch<{ url: string }>("/admin/billing/payment-link", adminKey, {
        method: "POST",
        body: JSON.stringify({
          client_schema: client.schema_name,
          monthly_fee_cents: Math.round(dollars * 100),
        }),
      });
      setLink(data.url);
      toast.success("Payment link created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!client} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment link — {client?.business_name ?? client?.schema_name}</DialogTitle>
        </DialogHeader>
        {link ? (
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium text-green-700">Link ready — send it to the customer:</p>
            <div className="bg-secondary rounded-xl p-3 break-all">
              <a href={link} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">{link}</a>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Copied"); }}>
                Copy link
              </Button>
              <Button className="flex-1" variant="outline" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Monthly price (USD)</Label>
              <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="450" />
              <p className="text-xs text-muted-foreground">
                Creates a non-expiring Stripe subscription link at this price (and saves it as the
                client's monthly fee). Send it to the customer — they pay by card or ACH without logging in.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button className="flex-1" onClick={generate} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClientsTable({ clients, onPaymentLink }: { clients: Client[]; onPaymentLink: (c: Client) => void }) {
  const active = clients.filter((c) => c.is_active);
  const mrr    = active.reduce((s, c) => s + (c.monthly_fee ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total clients</p>
          <p className="text-2xl font-semibold text-primary mt-1">{clients.length}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs text-muted-foreground">MRR (active)</p>
          <p className="text-2xl font-semibold text-primary mt-1">${mrr.toLocaleString()}</p>
        </div>
      </div>

      {!clients.length ? (
        <p className="text-sm text-muted-foreground py-4">No clients yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Business</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Schema</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Onboarding</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Active</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden lg:table-cell">MRR</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Square</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.schema_name} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2.5 px-2 font-medium">{c.business_name ?? "—"}</td>
                  <td className="py-2.5 px-2 hidden md:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">{c.schema_name}</span>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-muted-foreground">
                    {c.onboarding_status ?? "—"}
                  </td>
                  <td className="py-2.5 px-2 hidden sm:table-cell">
                    {c.is_active
                      ? <span className="text-xs text-green-600 font-medium">Yes</span>
                      : <span className="text-xs text-muted-foreground">No</span>}
                  </td>
                  <td className="py-2.5 px-2 hidden lg:table-cell text-muted-foreground text-xs">
                    {c.monthly_fee != null ? `$${c.monthly_fee.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-2.5 px-2">
                    {c.square_connected
                      ? <span className="text-xs text-green-600 font-medium">✓ Yes</span>
                      : <span className="text-xs text-muted-foreground">No</span>}
                  </td>
                  <td className="py-2.5 px-2 hidden sm:table-cell text-xs text-muted-foreground">
                    {c.created_at?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="py-2.5 px-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 whitespace-nowrap"
                      onClick={() => onPaymentLink(c)}
                    >
                      Payment link
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Support inbox ───────────────────────────────────────────────────────────

function SupportInbox({ adminKey }: { adminKey: string }) {
  const [threads,  setThreads]  = useState<SupportThread[]>([]);
  const [selected, setSelected] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [reply,    setReply]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ threads: SupportThread[] }>("/admin/support/threads", adminKey);
      setThreads(data.threads);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load support threads.");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  async function openThread(t: SupportThread) {
    setSelected(t);
    setMessages([]);
    try {
      const data = await apiFetch<{ messages: SupportMsg[] }>(
        `/admin/support/thread?portal=${t.portal}&user_id=${encodeURIComponent(t.user_id)}`,
        adminKey,
      );
      setMessages(data.messages);
      // optimistically clear this thread's unread badge
      setThreads((prev) => prev.map((x) =>
        x.portal === t.portal && x.user_id === t.user_id ? { ...x, unread: 0 } : x));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open thread.");
    }
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    try {
      const msg = await apiFetch<SupportMsg>("/admin/support/reply", adminKey, {
        method: "POST",
        body: JSON.stringify({
          portal:        selected.portal,
          user_id:       selected.user_id,
          client_schema: selected.client_schema,
          user_email:    selected.user_email,
          user_label:    selected.user_label,
          body:          text,
        }),
      });
      setMessages((prev) => [...prev, msg]);
      setReply("");
      setThreads((prev) => prev.map((x) =>
        x.portal === selected.portal && x.user_id === selected.user_id
          ? { ...x, last_body: text, last_at: msg.created_at } : x));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-4">
      {/* Thread list */}
      <div className="bg-card border border-border rounded-2xl p-2 md:max-h-[70vh] md:overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-2">
          <h2 className="font-semibold text-primary text-sm">Threads</h2>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => void loadThreads()} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {threads.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-4">No support messages yet.</p>
        ) : (
          <ul className="space-y-1">
            {threads.map((t) => (
              <li key={`${t.portal}:${t.user_id}`}>
                <button
                  onClick={() => void openThread(t)}
                  className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                    selected?.user_id === t.user_id && selected?.portal === t.portal
                      ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.user_label || t.user_email || t.user_id.slice(0, 8)}</span>
                    {t.unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] uppercase font-semibold px-1 rounded ${
                      t.portal === "ea" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                    }`}>{t.portal}</span>
                    <span className="text-xs text-muted-foreground truncate">{t.last_body}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Thread view */}
      <div className="bg-card border border-border rounded-2xl flex flex-col md:max-h-[70vh]">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-16">
            Select a thread to read & reply.
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border">
              <div className="font-semibold text-sm text-primary">{selected.user_label || selected.user_email}</div>
              <div className="text-xs text-muted-foreground">
                {selected.portal === "ea" ? "EA" : "Client"}
                {selected.client_schema ? ` · ${selected.client_schema}` : ""}
                {selected.user_email ? ` · ${selected.user_email}` : ""}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-[240px]">
              {messages.map((m) => {
                const isSupport = m.sender === "support";
                return (
                  <div key={m.id} className={`flex ${isSupport ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      isSupport ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}>
                      {m.body}
                      <div className={`text-[10px] mt-1 ${isSupport ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-3 border-t border-border flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendReply(); } }}
                placeholder="Type a reply…"
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none min-h-[40px] max-h-[120px]"
                disabled={sending}
              />
              <Button onClick={() => void sendReply()} disabled={!reply.trim() || sending} className="shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Assignments (EA client offers) ────────────────────────────────────────────

interface EaRosterItem {
  user_id:            string;
  full_name:          string | null;
  firm_name:          string | null;
  email:              string | null;
  active_clients:     number;
  max_active_clients: number | null;
}

interface AdminOffer {
  id:            string;
  client_schema: string;
  ea_user_id:    string;
  status:        string;
  offer_type:    string;
  offered_at:    string;
  responded_at:  string | null;
  expires_at:    string;
}

const OFFER_STATUS_STYLES: Record<string, string> = {
  offered:   "bg-amber-100 text-amber-800",
  accepted:  "bg-green-100 text-green-800",
  rejected:  "bg-red-100 text-red-700",
  expired:   "bg-slate-100 text-slate-600",
  withdrawn: "bg-slate-100 text-slate-600",
};

function AssignmentsTab({ adminKey, clients }: { adminKey: string; clients: Client[] }) {
  const [eas,           setEas]           = useState<EaRosterItem[]>([]);
  const [offers,        setOffers]        = useState<AdminOffer[]>([]);
  const [clientSchema,  setClientSchema]  = useState("");
  const [eaId,          setEaId]          = useState("");
  const [busy,          setBusy]          = useState(false);
  const [loading,       setLoading]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, o] = await Promise.all([
        apiFetch<EaRosterItem[]>("/admin/eas", adminKey),
        apiFetch<AdminOffer[]>("/admin/assignments", adminKey),
      ]);
      setEas(e);
      setOffers(o);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { void load(); }, [load]);

  async function createOffer() {
    if (!clientSchema || !eaId) { toast.error("Pick a client and an EA."); return; }
    setBusy(true);
    try {
      await apiFetch("/admin/assignments/offer", adminKey, {
        method: "POST",
        body: JSON.stringify({ client_schema: clientSchema, ea_user_id: eaId }),
      });
      toast.success("Offer sent to the EA.");
      setClientSchema("");
      setEaId("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send offer.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    try {
      await apiFetch(`/admin/assignments/${id}/withdraw`, adminKey, { method: "POST" });
      toast.success("Offer withdrawn.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to withdraw.");
    }
  }

  const eaName = (id: string) => {
    const e = eas.find((x) => x.user_id === id);
    return e?.full_name || e?.email || id.slice(0, 8);
  };
  const bizName = (schema: string) =>
    clients.find((c) => c.schema_name === schema)?.business_name || schema;

  return (
    <div className="space-y-6">
      {/* Create offer */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-6">
        <h2 className="font-semibold text-primary mb-4">Offer a client to an EA</h2>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <select
              value={clientSchema}
              onChange={(e) => setClientSchema(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-2 py-2 focus:outline-none"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.schema_name} value={c.schema_name}>
                  {c.business_name || c.schema_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>EA / CPA</Label>
            <select
              value={eaId}
              onChange={(e) => setEaId(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-2 py-2 focus:outline-none"
            >
              <option value="">Select an EA…</option>
              {eas.map((e) => (
                <option key={e.user_id} value={e.user_id}>
                  {(e.full_name || e.email || e.user_id.slice(0, 8))}
                  {` — ${e.active_clients}${e.max_active_clients != null ? `/${e.max_active_clients}` : ""} clients`}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={createOffer} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send offer
          </Button>
        </div>
        {eas.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground mt-3">
            No EAs on the roster yet — an EA must sign up and be added to <code>ea_users</code> first.
          </p>
        )}
      </div>

      {/* Offers list */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-primary">Offers</h2>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No offers yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Client</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">EA</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Offered</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-2 font-medium">{bizName(o.client_schema)}</td>
                    <td className="py-2.5 px-2">{eaName(o.ea_user_id)}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${OFFER_STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 hidden sm:table-cell text-xs text-muted-foreground">
                      {o.offered_at?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {o.status === "offered" && (
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => void withdraw(o.id)}>
                          Withdraw
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: (key: string) => void }) {
  const [key,      setKey]      = useState("");
  const [error,    setError]    = useState("");
  const [checking, setChecking] = useState(false);

  async function verify() {
    const trimmed = key.trim();
    if (!trimmed) return;
    setChecking(true);
    setError("");
    try {
      await apiFetch("/admin/leads", trimmed);
      // SEC-06: the admin key is held in memory only (React state) — never in
      // sessionStorage/localStorage — so an XSS payload cannot exfiltrate a
      // persisted credential. Trade-off: re-entry is required after a reload.
      onSuccess(trimmed);
    } catch {
      setError("Invalid password.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Desired Labs</div>
          <h1 className="font-display text-2xl font-semibold text-primary">Admin access</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="space-y-2">
            <Label>Admin password</Label>
            <Input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void verify(); }}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" onClick={() => void verify()} disabled={checking || !key.trim()}>
            {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function AdminPanel() {
  // SEC-06: in-memory only — not restored from storage on load.
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [tab,          setTab]          = useState<"leads" | "clients" | "assignments" | "support">("leads");
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [clients,      setClients]      = useState<Client[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [paymentLinkClient, setPaymentLinkClient] = useState<Client | null>(null);

  const loadData = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const [l, c] = await Promise.all([
        apiFetch<Lead[]>("/admin/leads", key),
        apiFetch<Client[]>("/admin/clients", key),
      ]);
      setLeads(l);
      setClients(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminKey) void loadData(adminKey);
  }, [adminKey, loadData]);

  if (!adminKey) {
    return <AdminLogin onSuccess={(key) => setAdminKey(key)} />;
  }

  function signOut() {
    setAdminKey(null);
  }

  function handleStatusChange(id: number, status: string) {
    setLeads((prev) =>
      prev.map((l) => l.id === id ? { ...l, status: status as Lead["status"] } : l),
    );
  }

  function handleSent(leadId: number) {
    handleStatusChange(leadId, "contacted");
    setSelectedLead(null);
  }

  const isLoading = loading && !leads.length && !clients.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-accent">Desired Labs</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="font-semibold text-sm text-primary">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Refresh"
              onClick={() => void loadData(adminKey)}
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex">
          {(["leads", "clients", "assignments", "support"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "leads"
                ? `Leads${leads.length ? ` (${leads.length})` : ""}`
                : t === "clients"
                  ? `Clients${clients.length ? ` (${clients.length})` : ""}`
                  : t === "assignments"
                    ? "Assignments"
                    : "Support"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            {tab === "leads" && (
              <div className="bg-card border border-border rounded-2xl p-4 md:p-6">
                <h2 className="font-semibold text-primary mb-4">Leads</h2>
                <LeadsTable
                  leads={leads}
                  adminKey={adminKey}
                  onStatusChange={handleStatusChange}
                  onSendLink={setSelectedLead}
                />
              </div>
            )}
            {tab === "clients" && (
              <div className="bg-card border border-border rounded-2xl p-4 md:p-6">
                <h2 className="font-semibold text-primary mb-4">Clients</h2>
                <ClientsTable clients={clients} onPaymentLink={setPaymentLinkClient} />
              </div>
            )}
            {tab === "assignments" && <AssignmentsTab adminKey={adminKey} clients={clients} />}
            {tab === "support" && <SupportInbox adminKey={adminKey} />}
          </>
        )}
      </div>

      <SendOnboardingModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        adminKey={adminKey}
        onSent={handleSent}
      />

      <PaymentLinkModal
        client={paymentLinkClient}
        onClose={() => { setPaymentLinkClient(null); void loadData(adminKey); }}
        adminKey={adminKey}
      />
    </div>
  );
}
