// EA editable worksheet — P&L and Balance Sheet with inline editing and Excel export.
// Click any cell to edit; blur commits and saves to ea_adjustments. Amber = EA-edited.
import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  getWorksheet, saveAdjustment, resetAdjustments, worksheetExportUrl,
  type PLCategoryRow, type BSItem, type WorksheetData,
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
  const [saving,    setSaving]   = useState(false);
  const [addingSection, setAdding] = useState<"rev" | "cogs" | "opex" | null>(null);
  const [newLabel,  setNewLabel]  = useState("");
  const [newAmt,    setNewAmt]    = useState("");
  const [editKey,   setEditKey]   = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const adjCount = [...pl.revenue_lines, ...pl.cogs_categories, ...pl.opex_categories]
    .filter((r) => r.is_adjusted).length + (pl.tax_collected.is_adjusted ? 1 : 0);

  async function saveAmount(row: PLCategoryRow) {
    const n = parseFloat(editDraft);
    if (isNaN(n) || n === row.amount) { setEditKey(null); return; }
    setSaving(true);
    try {
      await saveAdjustment(schema, {
        period, sheet_type: "pl", expense_id: row.key,
        field_changed: "category_total",
        original_value: String(row.base_amount), new_value: String(n),
      });
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); setEditKey(null); }
  }

  async function saveTaxAdjust() {
    const n = parseFloat(editDraft);
    if (isNaN(n)) { setEditKey(null); return; }
    setSaving(true);
    try {
      await saveAdjustment(schema, {
        period, sheet_type: "pl", expense_id: "rev_tax_collected",
        field_changed: "category_total",
        original_value: String(pl.tax_collected.amount), new_value: String(n),
      });
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); setEditKey(null); }
  }

  async function addLine(prefix: "rev" | "cogs" | "opex") {
    if (!newLabel.trim() || !newAmt.trim()) return;
    const n = parseFloat(newAmt);
    if (isNaN(n)) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await saveAdjustment(schema, {
        period, sheet_type: "pl",
        expense_id: `${prefix}_ea_${Date.now()}`,
        field_changed: "new_line", new_value: String(n), note: newLabel.trim(),
      });
      setNewLabel(""); setNewAmt(""); setAdding(null);
      onRefresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to add"); }
    finally { setSaving(false); }
  }

  function AmountCell({ row }: { row: PLCategoryRow }) {
    if (editKey === row.key) {
      return (
        <Input autoFocus value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          onBlur={() => saveAmount(row)}
          onKeyDown={(e) => { if (e.key === "Enter") saveAmount(row); if (e.key === "Escape") setEditKey(null); }}
          className="h-6 w-28 text-xs text-right py-0 px-1 ml-auto"
        />
      );
    }
    return (
      <span className="cursor-text tabular-nums" title="Click to override"
        onClick={() => { setEditKey(row.key); setEditDraft(String(row.amount)); }}>
        ${fmt(row.amount)}
      </span>
    );
  }

  function AddLineRow({ prefix }: { prefix: "rev" | "cogs" | "opex" }) {
    if (addingSection === prefix) {
      return (
        <tr className="border-t border-border bg-secondary/20">
          <td className="px-3 py-1.5">
            <Input autoFocus placeholder="Description" value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addLine(prefix);
                if (e.key === "Escape") { setAdding(null); setNewLabel(""); setNewAmt(""); }
              }}
              className="h-6 text-xs py-0 px-1"
            />
          </td>
          <td className="px-3 py-1.5">
            <Input placeholder="0.00" value={newAmt}
              onChange={(e) => setNewAmt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addLine(prefix);
                if (e.key === "Escape") { setAdding(null); setNewAmt(""); setNewLabel(""); }
              }}
              className="h-6 w-28 text-xs text-right py-0 px-1 ml-auto"
            />
          </td>
          <td className="px-2 py-1 flex gap-1">
            <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => addLine(prefix)}>Add</Button>
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1"
              onClick={() => { setAdding(null); setNewLabel(""); setNewAmt(""); }}>✕</Button>
          </td>
        </tr>
      );
    }
    return (
      <tr className="border-t border-dashed border-border/40">
        <td colSpan={3} className="px-3 py-1">
          <button className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
            onClick={() => setAdding(prefix)}>
            <span className="text-sm leading-none font-bold">+</span> Add line
          </button>
        </td>
      </tr>
    );
  }

  function SectionTable({ title, rows, prefix, subtotalLabel, subtotal }: {
    title: string; rows: PLCategoryRow[];
    prefix: "rev" | "cogs" | "opex"; subtotalLabel: string; subtotal: number;
  }) {
    return (
      <div className="rounded-md border border-border overflow-hidden text-xs">
        <div className="bg-primary/90 px-3 py-1.5 text-primary-foreground font-semibold uppercase tracking-wide text-[11px]">
          {title}
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={cn(
                "border-t border-border",
                row.is_adjusted ? "bg-amber-50" : "bg-card hover:bg-secondary/20",
              )}>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-1.5">
                    {row.label}
                    {row.is_adjusted && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1 py-0 h-4">edited</Badge>
                    )}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right"><AmountCell row={row} /></td>
                <td className="w-4" />
              </tr>
            ))}
            <AddLineRow prefix={prefix} />
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/60 font-semibold">
              <td className="px-3 py-1.5">{subtotalLabel}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">${fmt(subtotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: "Gross Revenue", val: pl.revenue_gross },
          { label: "Gross Profit",  val: pl.gross_profit  },
          { label: "OpEx",          val: pl.opex_total    },
          { label: "Net Income",    val: pl.net_income, colored: true },
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

      <div className="flex items-center gap-2 h-4">
        {adjCount > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
            {adjCount} edited
          </Badge>
        )}
        {saving && <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Saving…</span></>}
      </div>

      {/* Revenue */}
      <div className="rounded-md border border-border overflow-hidden text-xs">
        <div className="bg-primary px-3 py-1.5 text-primary-foreground font-semibold uppercase tracking-wide text-[11px]">
          Revenue
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {pl.revenue_lines.map((row) => (
              <tr key={row.key} className={cn(
                "border-t border-border",
                row.is_adjusted ? "bg-amber-50" : "bg-card hover:bg-secondary/20",
              )}>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-1.5">
                    {row.label}
                    {row.is_adjusted && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1 py-0 h-4">edited</Badge>
                    )}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right"><AmountCell row={row} /></td>
                <td className="w-4" />
              </tr>
            ))}
            {/* Sales Tax Collected — editable deduction */}
            <tr className={cn("border-t border-border", pl.tax_collected.is_adjusted ? "bg-amber-50" : "bg-card")}>
              <td className="px-3 py-1.5 text-muted-foreground italic flex items-center gap-1.5">
                Sales Tax Collected
                {pl.tax_collected.is_adjusted && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1 py-0 h-4">edited</Badge>
                )}
              </td>
              <td className="px-3 py-1.5 text-right text-muted-foreground italic">
                {editKey === "rev_tax_collected" ? (
                  <Input autoFocus value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onBlur={saveTaxAdjust}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTaxAdjust(); if (e.key === "Escape") setEditKey(null); }}
                    className="h-6 w-28 text-xs text-right py-0 px-1 ml-auto"
                  />
                ) : (
                  <span className="cursor-text tabular-nums" title="Click to override"
                    onClick={() => { setEditKey("rev_tax_collected"); setEditDraft(String(pl.tax_collected.amount)); }}>
                    (${fmt(pl.tax_collected.amount)})
                  </span>
                )}
              </td>
              <td className="w-4" />
            </tr>
            <AddLineRow prefix="rev" />
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/60 font-semibold">
              <td className="px-3 py-1.5">Net Revenue</td>
              <td className="px-3 py-1.5 text-right tabular-nums">${fmt(pl.net_revenue)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* COGS */}
      {pl.cogs_categories.length > 0 && (
        <SectionTable title="Cost of Goods Sold" rows={pl.cogs_categories}
          prefix="cogs" subtotalLabel="Total COGS" subtotal={pl.cogs_total} />
      )}

      {/* Gross Profit */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 flex justify-between items-center font-semibold text-sm text-primary">
        <span>Gross Profit</span>
        <span className="tabular-nums">${fmt(pl.gross_profit)}</span>
      </div>

      {/* OpEx */}
      <SectionTable title="Operating Expenses" rows={pl.opex_categories}
        prefix="opex" subtotalLabel="Total Operating Expenses" subtotal={pl.opex_total} />

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
