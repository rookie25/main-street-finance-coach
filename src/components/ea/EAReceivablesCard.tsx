// EA portal — accounts receivable for a client: what the client's customers owe
// them. Read-only for the CPA (Cliff) to reconcile deposits & chase aging.
import { useQuery } from "@tanstack/react-query";
import { getClientReceivables, type EAReceivable } from "@/lib/eaApi";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function dateLabel(d: string | null): string {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

const STATUS_STYLE: Record<EAReceivable["status"], string> = {
  draft:   "bg-secondary text-muted-foreground",
  sent:    "bg-primary/10 text-primary",
  paid:    "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void:    "bg-secondary text-muted-foreground line-through",
};

export default function EAReceivablesCard({ schema }: { schema: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ea", "receivables", schema],
    queryFn:  () => getClientReceivables(schema),
    enabled:  !!schema,
    staleTime: 30_000,
  });

  const s = data?.summary;
  // Show open invoices first (overdue, then sent), then the rest.
  const invoices = (data?.invoices ?? []).filter((i) => i.status !== "void");
  const open = invoices.filter((i) => i.status === "overdue" || i.status === "sent");
  const closed = invoices.filter((i) => i.status === "paid" || i.status === "draft");
  const ordered = [...open, ...closed];

  // Nothing to show for businesses that don't invoice (e.g. coffee/POS).
  if (!isLoading && s && s.count === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Accounts Receivable</h3>
        {s && (
          <div className="text-right">
            <div className="text-sm font-semibold text-foreground">{money(s.outstanding)}</div>
            <div className="text-[11px] text-muted-foreground">
              outstanding
              {s.overdue > 0 && (
                <span className="text-red-600 font-medium"> · {money(s.overdue)} overdue</span>
              )}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : ordered.length === 0 ? (
        <p className="text-xs text-muted-foreground">No invoices yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {ordered.map((inv) => (
            <li key={inv.invoice_number} className="flex items-center gap-2 py-2 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{inv.customer}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${STATUS_STYLE[inv.status]}`}>
                    {inv.status}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {inv.invoice_number}
                  {inv.due_date ? ` · due ${dateLabel(inv.due_date)}` : ""}
                  {inv.status === "overdue" && inv.days_overdue != null
                    ? ` · ${inv.days_overdue}d late`
                    : inv.status === "paid" && inv.paid_at
                    ? ` · paid ${dateLabel(inv.paid_at)}`
                    : ""}
                </div>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{money(inv.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
