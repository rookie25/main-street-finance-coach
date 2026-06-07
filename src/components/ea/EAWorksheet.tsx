// EA editable worksheet — P&L and Balance Sheet with inline editing and Excel export.
// Click any cell to edit; blur commits and saves to ea_adjustments. Amber = EA-edited.
import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  getWorksheet, saveAdjustment, resetAdjustments, worksheetExportUrl,
  type PLRow, type BSItem, type WorksheetData,
} from "@/lib/eaApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type EditState = { rowId: string; field: string } | null;

interface EditCellProps {
  value:    string | number;
  field:    string;
  rowId:    string;
  editing:  EditState;
  draft:    string;
  onBegin:  (id: string, field: string, val: string) => void;
  onDraft:  (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  numeric?: boolean;
}

function EditCell({ value, field, rowId, editing, draft, onBegin, onDraft, onCommit, onCancel, numeric }: EditCellProps) {
  const active  = editing?.rowId === rowId && editing?.field === field;
  const display = numeric ? fmt(Number(value)) : String(value ?? "");
  if (active) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel(); }}
        className={cn("h-7 text-xs py-0 px-1", numeric && "text-right")}
      />
    );
  }
  return (
    <span
      className="cursor-text block w-full min-h-[1.25rem]"
      onClick={() => onBegin(rowId, field, String(value ?? ""))}
    >
      {display || <span className="text-muted-foreground italic text-xs">—</span>}
    </span>
  );
}

// ── P&L sub-tab ───────────────────────────────────────────────────────────────

function PLSubTab({ pl, schema, period, onRefresh }: {
  pl: WorksheetData["pl"]; schema: string; period: string; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<EditState>(null);
  const [draft,   setDraft]   = useState("");
  const [saving,  setSaving]  = useState(false);

  function beginEdit(rowId: string, field: string, val: string) {
    setEditing({ rowId, field }); setDraft(val);
  }

  async function commitEdit(row: PLRow) {
    if (!editing) return;
    const origVal = String(row[editing.field as keyof PLRow] ?? "");
    if (draft === origVal) { setEditing(null); return; }
    setSaving(true);
    try {
      await saveAdjustment(schema, {
        period, sheet_type: "pl", expense_id: row.id,
        field_changed: editing.field, original_value: origVal, new_value: draft,
      });
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false); setEditing(null);
    }
  }

  const adjCount = pl.rows.filter((r) => r.is_adjusted).length;

  const sections: Array<{ label: string; type: string; subtotal: number }> = [
    { label: "Cost of Goods Sold", type: "cogs", subtotal: pl.cogs_total },
    { label: "Operating Expenses", type: "opex", subtotal: pl.opex_total },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: "Revenue",      val: pl.revenue_total },
          { label: "Gross Profit", val: pl.gross_profit  },
          { label: "OpEx",         val: pl.opex_total    },
          { label: "Net Income",   val: pl.net_income, colored: true },
        ] as { label: string; val: number; colored?: boolean }[]).map(({ label, val, colored }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className={cn("text-sm font-bold tabular-nums",
              colored ? (val >= 0 ? "text-primary" : "text-destructive") : "text-foreground"
            )}>
              ${fmt(val)}
            </div>
          </div>
        ))}
      </div>

      {/* Status strip */}
      <div className="flex items-center gap-2">
        {adjCount > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
            {adjCount} edited
          </Badge>
        )}
        {saving && <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Saving…</span></>}
      </div>

      {/* Revenue — read-only summary line */}
      <div className="rounded-md border border-border overflow-hidden text-xs">
        <div className="bg-primary px-3 py-1.5 text-primary-foreground font-semibold uppercase tracking-wide text-[11px]">
          Revenue
        </div>
        <div className="grid grid-cols-[1fr_auto] px-3 py-2 bg-card gap-4">
          <span className="text-muted-foreground">Square Sales (gross)</span>
          <span className="font-medium tabular-nums">${fmt(pl.revenue_total)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] px-3 py-1.5 bg-muted/40 gap-4 border-t border-border font-semibold">
          <span>Total Revenue</span>
          <span className="tabular-nums">${fmt(pl.revenue_total)}</span>
        </div>
      </div>

      {/* Expense sections */}
      {sections.map(({ label, type, subtotal }) => {
        const rows = pl.rows.filter((r) => r.expense_type === type);
        if (!rows.length) return null;
        return (
          <div key={type} className="rounded-md border border-border overflow-hidden text-xs">
            <div className="bg-primary/90 px-3 py-1.5 text-primary-foreground font-semibold uppercase tracking-wide text-[11px]">
              {label}
            </div>
            <table className="w-full border-collapse">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-24">Date</th>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Vendor</th>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-36">Category</th>
                  <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-24">Amount</th>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-32">Note</th>
                  <th className="w-14" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={cn(
                    "border-t border-border transition-colors",
                    row.is_adjusted ? "bg-amber-50" : "bg-card hover:bg-secondary/30",
                  )}>
                    <td className="px-2 py-1.5 text-muted-foreground">{row.date}</td>
                    <td className="px-2 py-1.5">
                      <EditCell value={row.vendor} field="vendor" rowId={row.id}
                        editing={editing} draft={draft} onBegin={beginEdit}
                        onDraft={setDraft} onCommit={() => commitEdit(row)} onCancel={() => setEditing(null)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <EditCell value={row.pl_category} field="pl_category" rowId={row.id}
                        editing={editing} draft={draft} onBegin={beginEdit}
                        onDraft={setDraft} onCommit={() => commitEdit(row)} onCancel={() => setEditing(null)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <EditCell value={row.amount} field="amount" rowId={row.id}
                        editing={editing} draft={draft} numeric onBegin={beginEdit}
                        onDraft={setDraft} onCommit={() => commitEdit(row)} onCancel={() => setEditing(null)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <EditCell value={row.note} field="note" rowId={row.id}
                        editing={editing} draft={draft} onBegin={beginEdit}
                        onDraft={setDraft} onCommit={() => commitEdit(row)} onCancel={() => setEditing(null)} />
                    </td>
                    <td className="px-2 py-1.5">
                      {row.is_adjusted && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1 py-0 h-4">
                          edited
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/60 font-semibold">
                  <td colSpan={3} className="px-2 py-1.5">Subtotal — {label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">${fmt(subtotal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {/* Net Income */}
      <div className={cn(
        "rounded-lg border-2 px-4 py-3 flex justify-between items-center font-bold text-sm",
        pl.net_income >= 0
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-destructive/40 bg-destructive/5 text-destructive",
      )}>
        <span>NET INCOME</span>
        <span className="text-base tabular-nums">${fmt(pl.net_income)}</span>
      </div>
    </div>
  );
}

// ── Balance Sheet sub-tab ─────────────────────────────────────────────────────

function BSSection({ title, items, total, editing, draft, onBegin, onDraft, onCommit, onCancel }: {
  title:    string;
  items:    BSItem[];
  total:    number;
  editing:  EditState;
  draft:    string;
  onBegin:  (id: string, field: string, val: string) => void;
  onDraft:  (v: string) => void;
  onCommit: (item: BSItem, field: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden text-xs">
      <div className="bg-primary/90 px-3 py-1.5 text-primary-foreground font-semibold uppercase tracking-wide text-[11px]">
        {title}
      </div>
      {items.length > 0 ? (
        <table className="w-full border-collapse">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Account</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-28">Amount</th>
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-36">Note</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={cn(
                "border-t border-border transition-colors",
                item.is_adjusted ? "bg-amber-50" : "bg-card hover:bg-secondary/30",
              )}>
                <td className="px-2 py-1.5">
                  <EditCell value={item.label} field="label" rowId={item.id}
                    editing={editing} draft={draft} onBegin={onBegin} onDraft={onDraft}
                    onCommit={() => onCommit(item, "label")} onCancel={onCancel} />
                </td>
                <td className="px-2 py-1.5">
                  <EditCell value={item.amount} field="amount" rowId={item.id} numeric
                    editing={editing} draft={draft} onBegin={onBegin} onDraft={onDraft}
                    onCommit={() => onCommit(item, "amount")} onCancel={onCancel} />
                </td>
                <td className="px-2 py-1.5">
                  <EditCell value={item.note} field="note" rowId={item.id}
                    editing={editing} draft={draft} onBegin={onBegin} onDraft={onDraft}
                    onCommit={() => onCommit(item, "note")} onCancel={onCancel} />
                </td>
                <td className="px-2 py-1.5">
                  {item.is_adjusted && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1 py-0 h-4">
                      edited
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/60 font-semibold">
              <td className="px-2 py-1.5">Total {title}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">${fmt(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      ) : (
        <div className="px-3 py-2 text-muted-foreground italic">No entries.</div>
      )}
    </div>
  );
}

function BSSubTab({ bs, schema, period, onRefresh }: {
  bs: WorksheetData["bs"]; schema: string; period: string; onRefresh: () => void;
}) {
  const [editing,  setEditing]  = useState<EditState>(null);
  const [draft,    setDraft]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmt,   setNewAmt]   = useState("");

  function beginEdit(rowId: string, field: string, val: string) {
    setEditing({ rowId, field }); setDraft(val);
  }

  async function commitEdit(item: BSItem, field: string) {
    const origVal = String(field === "amount" ? item.amount : (item as Record<string, unknown>)[field] ?? "");
    if (draft === origVal) { setEditing(null); return; }
    setSaving(true);
    try {
      await saveAdjustment(schema, {
        period, sheet_type: "bs", expense_id: item.id,
        field_changed: field, original_value: origVal, new_value: draft,
      });
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false); setEditing(null);
    }
  }

  async function addLiability() {
    if (!newLabel.trim() || !newAmt.trim()) return;
    setSaving(true);
    try {
      await saveAdjustment(schema, {
        period, sheet_type: "bs", expense_id: null,
        field_changed: "liability_item", new_value: newAmt, note: newLabel,
      });
      setNewLabel(""); setNewAmt("");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add liability");
    } finally {
      setSaving(false);
    }
  }

  const sectionProps = { editing, draft, onBegin: beginEdit, onDraft: setDraft, onCommit: commitEdit, onCancel: () => setEditing(null) };

  return (
    <div className="flex flex-col gap-3">
      {saving && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </div>
      )}

      <BSSection title="Current Assets" items={bs.assets.current} total={bs.assets.total_current} {...sectionProps} />
      <BSSection title="Fixed Assets"   items={bs.assets.fixed}   total={bs.assets.total_fixed}   {...sectionProps} />

      {/* Total Assets */}
      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-2 flex justify-between text-sm font-bold text-primary">
        <span>Total Assets</span>
        <span className="tabular-nums">${fmt(bs.assets.total)}</span>
      </div>

      {/* Liabilities — EA-managed via ea_adjustments */}
      <div className="rounded-md border border-border overflow-hidden text-xs">
        <div className="bg-primary/90 px-3 py-1.5 text-primary-foreground font-semibold uppercase tracking-wide text-[11px]">
          Liabilities
        </div>
        {bs.liabilities.items.length > 0 ? (
          <table className="w-full border-collapse">
            <tbody>
              {bs.liabilities.items.map((item) => (
                <tr key={item.id} className="border-t border-border bg-amber-50">
                  <td className="px-2 py-1.5">{item.label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums w-28">${fmt(item.amount)}</td>
                  <td colSpan={2} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-secondary/60 font-semibold">
                <td className="px-2 py-1.5">Total Liabilities</td>
                <td className="px-2 py-1.5 text-right tabular-nums w-28">${fmt(bs.liabilities.total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="px-3 py-2 text-muted-foreground italic">No liabilities recorded.</div>
        )}
        {/* Add liability row */}
        <div className="border-t border-border px-3 py-2 flex gap-2 items-center bg-secondary/20">
          <Input
            placeholder="Account name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Amount"
            type="number"
            value={newAmt}
            onChange={(e) => setNewAmt(e.target.value)}
            className="h-7 text-xs w-28"
          />
          <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
            onClick={addLiability} disabled={saving || !newLabel.trim() || !newAmt.trim()}>
            Add
          </Button>
        </div>
      </div>

      <BSSection title="Equity" items={bs.equity.items} total={bs.equity.total} {...sectionProps} />

      {/* Check line */}
      <div className={cn(
        "rounded-lg border-2 px-3 py-2 flex justify-between items-center text-sm font-bold",
        bs.balanced
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-destructive/40 bg-destructive/5 text-destructive",
      )}>
        <span>Total Liabilities + Equity</span>
        <span className="flex items-center gap-3">
          <span className="tabular-nums">${fmt(bs.total_liab_equity)}</span>
          <span className="text-xs font-normal">{bs.balanced ? "✓ balanced" : "⚠ check totals"}</span>
        </span>
      </div>
    </div>
  );
}

// ── Main EAWorksheet ──────────────────────────────────────────────────────────

export default function EAWorksheet({ schema, month }: { schema: string; month: string }) {
  const [data,      setData]      = useState<WorksheetData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getWorksheet(schema, month));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load worksheet");
    } finally {
      setLoading(false);
    }
  }, [schema, month]);

  useEffect(() => { load(); }, [load]);

  async function handleReset() {
    if (!confirm(`Reset all EA edits for ${month}? This cannot be undone.`)) return;
    setResetting(true);
    try {
      await resetAdjustments(schema, month);
      await load();
      toast.success("All edits reset");
    } catch (e) {
      toast.error("Reset failed");
    } finally {
      setResetting(false);
    }
  }

  const adjCount = data?.adjustments.length ?? 0;
  const exportUrl = worksheetExportUrl(schema, month);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button asChild size="sm" variant="outline">
          <a href={exportUrl} download>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download Excel
          </a>
        </Button>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
        {adjCount > 0 && (
          <>
            <Button size="sm" variant="ghost" onClick={handleReset} disabled={resetting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {resetting ? "Resetting…" : "Reset changes"}
            </Button>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
              {adjCount} {adjCount === 1 ? "change" : "changes"}
            </Badge>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <Tabs defaultValue="pl">
          <TabsList>
            <TabsTrigger value="pl">P&amp;L</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          </TabsList>
          <TabsContent value="pl" className="mt-3">
            <PLSubTab pl={data.pl} schema={schema} period={month} onRefresh={load} />
          </TabsContent>
          <TabsContent value="bs" className="mt-3">
            <BSSubTab bs={data.bs} schema={schema} period={month} onRefresh={load} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
