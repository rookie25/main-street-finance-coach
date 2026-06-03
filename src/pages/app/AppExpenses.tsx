// Client Portal — Expenses / Receipts (Component 4).
// Mark can view all expenses and edit: vendor name, date, category suggestion.
// Amount is shown read-only. Overrides write directly to Supabase under RLS.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RotateCcw, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { getExpenses, type ExpenseItem } from "@/lib/clientApi";
import { saveExpenseOverride, deleteExpenseOverride, EXPENSE_CATEGORIES } from "@/lib/clientData";
import { getMe } from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}

export default function AppExpenses() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);

  // Draft state for the edit sheet
  const [draftVendor,   setDraftVendor]   = useState("");
  const [draftDate,     setDraftDate]     = useState("");
  const [draftCategory, setDraftCategory] = useState("");

  const { data: meData } = useQuery({ queryKey: ["client", "me"], queryFn: getMe });
  const clientSchema = meData?.client_schema ?? "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "expenses", month],
    queryFn:  () => getExpenses(month),
    enabled:  !!month,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveExpenseOverride(clientSchema, editing!.id, {
        vendorName: draftVendor   || null,
        date:       draftDate     || null,
        category:   draftCategory || null,
      }),
    onSuccess: () => {
      toast.success("Changes saved.");
      qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const revertMutation = useMutation({
    mutationFn: (expense: ExpenseItem) =>
      deleteExpenseOverride(clientSchema, expense.id),
    onSuccess: () => {
      toast.success("Reverted to original.");
      qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Revert failed."),
  });

  function openEdit(expense: ExpenseItem) {
    setEditing(expense);
    setDraftVendor(expense.has_override ? expense.vendor : "");
    setDraftDate(expense.has_override ? expense.date : "");
    setDraftCategory(expense.has_override ? expense.category : "");
  }

  const expenses = data?.expenses ?? [];
  const total    = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-primary">Expenses</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ── Summary ────────────────────────────────────────────── */}
      {!isLoading && data && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "expense" : "expenses"} · {monthLabel(month)}
          </span>
          <span className="font-semibold">{fmt(total)}</span>
        </div>
      )}

      {/* ── Expense list ───────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No expenses recorded for {monthLabel(month)}.</p>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{e.vendor}</span>
                  {e.has_override && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent/40 text-accent shrink-0">
                      edited
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {e.category} · {e.date}
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">{fmt(e.amount)}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(e)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {e.has_override && (
                  <button
                    onClick={() => revertMutation.mutate(e)}
                    disabled={revertMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                    title="Revert to original"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Edit sheet ─────────────────────────────────────────── */}
      <Sheet open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Expense</SheetTitle>
          </SheetHeader>

          {editing && (
            <div className="space-y-4">
              {/* Read-only amount */}
              <div className="bg-secondary rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount (cannot edit)</span>
                <span className="font-semibold">{fmt(editing.amount)}</span>
              </div>

              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={draftVendor}
                  onChange={(e) => setDraftVendor(e.target.value)}
                  placeholder={editing.vendor_original}
                />
                {editing.has_override && editing.vendor !== editing.vendor_original && (
                  <p className="text-xs text-muted-foreground">Original: {editing.vendor_original}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Receipt Date</Label>
                <Input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  placeholder={editing.date_original}
                />
                {editing.has_override && editing.date !== editing.date_original && (
                  <p className="text-xs text-muted-foreground">Original: {editing.date_original}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Category Suggestion</Label>
                <Select value={draftCategory} onValueChange={setDraftCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={editing.category_original || "Select category…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <SheetFooter className="mt-6 gap-2 flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={saveMutation.isPending || !clientSchema}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
