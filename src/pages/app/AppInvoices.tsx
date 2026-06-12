// Client Portal — Invoicing / Accounts Receivable.
// Create invoices for your customers, track paid/unpaid, see what's outstanding
// and overdue, and download a clean PDF to send. Shown only for verticals that
// invoice (service / construction / general) — hidden for POS / food / retail.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Loader2, FileText, Download, Trash2, Check, Send, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInvoices, createInvoice, updateInvoice, deleteInvoice, openInvoicePdf,
  ApiError, type Invoice, type InvoiceStatus, type CreateInvoicePayload,
} from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function dateLabel(d: string | null): string {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft:   "bg-secondary text-muted-foreground",
  sent:    "bg-[#5B5BD6]/10 text-[#5B5BD6]",
  paid:    "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void:    "bg-secondary text-muted-foreground line-through",
};

interface DraftLine { description: string; quantity: string; unit_price: string; }
const blankLine = (): DraftLine => ({ description: "", quantity: "1", unit_price: "" });

export default function AppInvoices() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "invoices"],
    queryFn:  getInvoices,
    staleTime: 30_000,
  });
  const invoices = data?.invoices ?? [];
  const summary = data?.summary;

  const refresh = () => qc.invalidateQueries({ queryKey: ["client", "invoices"] });

  async function setStatus(inv: Invoice, status: InvoiceStatus) {
    try {
      await updateInvoice(inv.id, { status });
      toast.success(
        status === "paid" ? "Marked paid 🎉"
        : status === "sent" ? "Marked as sent"
        : status === "void" ? "Invoice voided" : "Updated",
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update");
    }
  }

  async function remove(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoice_number}? This can't be undone.`)) return;
    try {
      await deleteInvoice(inv.id);
      toast.success("Invoice deleted");
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete");
    }
  }

  async function pdf(inv: Invoice) {
    try { await openInvoicePdf(inv.id); }
    catch { toast.error("Couldn't open PDF"); }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-primary">Invoices</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New
        </Button>
      </div>

      {/* AR summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Outstanding</div>
          <div className="text-xl font-semibold text-foreground mt-0.5">
            {summary ? money(summary.outstanding) : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Overdue</div>
          <div className={`text-xl font-semibold mt-0.5 ${summary && summary.overdue > 0 ? "text-red-600" : "text-foreground"}`}>
            {summary ? money(summary.overdue) : "—"}
          </div>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Create one to start tracking what you're owed.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li key={inv.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{inv.customer_name}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${STATUS_STYLE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {inv.invoice_number} · {dateLabel(inv.issue_date)}
                    {inv.due_date ? ` · due ${dateLabel(inv.due_date)}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-semibold text-foreground">{money(inv.total)}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="shrink-0 p-1 rounded-lg text-muted-foreground hover:bg-secondary">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => pdf(inv)}>
                      <Download className="mr-2 h-4 w-4" /> View / download PDF
                    </DropdownMenuItem>
                    {inv.status === "draft" && (
                      <DropdownMenuItem onClick={() => setStatus(inv, "sent")}>
                        <Send className="mr-2 h-4 w-4" /> Mark as sent
                      </DropdownMenuItem>
                    )}
                    {(inv.status === "sent" || inv.status === "overdue" || inv.status === "draft") && (
                      <DropdownMenuItem onClick={() => setStatus(inv, "paid")}>
                        <Check className="mr-2 h-4 w-4" /> Mark as paid
                      </DropdownMenuItem>
                    )}
                    {inv.status !== "void" && inv.status !== "paid" && (
                      <DropdownMenuItem onClick={() => setStatus(inv, "void")}>
                        Void invoice
                      </DropdownMenuItem>
                    )}
                    {inv.status !== "paid" && (
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(inv)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreateInvoiceSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refresh(); }}
      />
    </div>
  );
}

function CreateInvoiceSheet({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taxStr, setTaxStr] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0),
    [lines],
  );
  const tax = Number(taxStr) || 0;
  const total = subtotal + tax;

  function reset() {
    setCustomer(""); setEmail(""); setDueDate(""); setNotes(""); setTaxStr("");
    setLines([blankLine()]);
  }

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function save(status: "draft" | "sent") {
    if (!customer.trim()) { toast.error("Add a customer name"); return; }
    const items = lines
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity) || 0,
        unit_price: Number(l.unit_price) || 0,
      }))
      .filter((l) => l.description || l.quantity * l.unit_price > 0);
    if (items.length === 0) { toast.error("Add at least one line item"); return; }

    const payload: CreateInvoicePayload = {
      customer_name: customer.trim(),
      customer_email: email.trim() || undefined,
      due_date: dueDate || undefined,
      notes: notes.trim() || undefined,
      tax,
      status,
      line_items: items,
    };
    setSaving(true);
    try {
      await createInvoice(payload);
      toast.success(status === "sent" ? "Invoice created & marked sent" : "Draft saved");
      reset();
      onCreated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't create invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o && !saving) { reset(); onClose(); } }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>New invoice</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-6">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Customer name *</label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Riverside Property Mgmt" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Customer email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Line items</label>
            {lines.map((l, i) => (
              <div key={i} className="rounded-lg border border-border p-2 space-y-2">
                <Input
                  value={l.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  placeholder="Description (e.g. Kitchen remodel — labor)"
                />
                <div className="flex items-center gap-2">
                  <Input
                    className="w-16" inputMode="decimal" value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })} placeholder="Qty"
                  />
                  <span className="text-muted-foreground text-sm">×</span>
                  <Input
                    className="flex-1" inputMode="decimal" value={l.unit_price}
                    onChange={(e) => updateLine(i, { unit_price: e.target.value })} placeholder="Rate ($)"
                  />
                  <span className="w-20 text-right text-sm font-medium">
                    {money((Number(l.quantity) || 0) * (Number(l.unit_price) || 0))}
                  </span>
                  {lines.length > 1 && (
                    <button
                      onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setLines((ls) => [...ls, blankLine()])}>
              <Plus className="mr-1.5 h-4 w-4" /> Add line
            </Button>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-secondary p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Tax</span>
              <Input
                className="w-24 h-8 text-right" inputMode="decimal" value={taxStr}
                onChange={(e) => setTaxStr(e.target.value)} placeholder="0.00"
              />
            </div>
            <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border">
              <span>Total</span><span>{money(total)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Payment terms, thank-you note, etc." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => save("draft")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
            </Button>
            <Button className="flex-1" disabled={saving} onClick={() => save("sent")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & mark sent"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
