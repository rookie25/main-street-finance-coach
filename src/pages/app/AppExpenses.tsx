// Client Portal — Expenses & Receipts (Component 4, Session 3 rev2).
//
// Permission model:
//   ✅ Edit vendor, date, category, amount freely (applied instantly)
//   ✅ Upload receipts — camera, file picker, PDF
//   ✅ Add cash expenses manually
//   ✅ Delete own uploaded receipts (instant)
//   ⏳ Delete Plaid transactions → flagged to EA (not deleted immediately)
//   ★  Amount change > $500 or prior-month → EA is notified, change still applied
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera, Paperclip, Plus, Pencil, Trash2, Loader2,
  AlertTriangle, CheckCircle2, Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  getExpenses, getMe, uploadReceipt, confirmReceipt, patchExpense, deleteExpense,
  type ExpenseItem, type ReceiptUploadResult,
} from "@/lib/clientApi";
import { EXPENSE_CATEGORIES } from "@/lib/clientData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}
function today() { return new Date().toISOString().slice(0, 10); }

// ── upload state machine ─────────────────────────────────────────────────────

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "review"; result: ReceiptUploadResult; editedVendor: string; editedAmount: string; editedDate: string; editedCategory: string }
  | { phase: "saving" };

// ── main component ────────────────────────────────────────────────────────────

export default function AppExpenses() {
  const qc           = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef    = useRef<HTMLInputElement>(null);

  const [month, setMonth]               = useState(currentMonth);
  const [uploadState, setUploadState]   = useState<UploadState>({ phase: "idle" });
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // Edit sheet
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [draftVendor,    setDraftVendor]    = useState("");
  const [draftAmount,    setDraftAmount]    = useState("");
  const [draftDate,      setDraftDate]      = useState("");
  const [draftCategory,  setDraftCategory]  = useState("");

  // Delete confirmation
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(null);

  // Manual cash expense
  const [showManual,     setShowManual]     = useState(false);
  const [manualVendor,   setManualVendor]   = useState("");
  const [manualAmount,   setManualAmount]   = useState("");
  const [manualDate,     setManualDate]     = useState(today);
  const [manualCategory, setManualCategory] = useState("");

  const { data: meData } = useQuery({ queryKey: ["client", "me"], queryFn: getMe });
  const clientSchema = meData?.client_schema ?? "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "expenses", month],
    queryFn:  () => getExpenses(month),
    enabled:  !!month,
  });

  // ── upload ──────────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setShowUploadSheet(true);
    setUploadState({ phase: "uploading" });
    try {
      const result = await uploadReceipt(file);
      setUploadState({
        phase: "review", result,
        editedVendor:   result.vendor   ?? "",
        editedAmount:   result.amount   != null ? String(result.amount) : "",
        editedDate:     result.date     ?? today(),
        editedCategory: result.category ?? "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read receipt. Try a clearer photo.");
      setShowUploadSheet(false);
      setUploadState({ phase: "idle" });
    }
  }

  async function handleConfirmUpload() {
    if (uploadState.phase !== "review") return;
    const { result, editedVendor, editedAmount, editedDate, editedCategory } = uploadState;
    const amtNum = parseFloat(editedAmount);
    if (!editedVendor.trim()) { toast.error("Vendor name required"); return; }
    if (isNaN(amtNum) || amtNum <= 0) { toast.error("Enter a valid amount"); return; }
    if (!editedDate) { toast.error("Date required"); return; }

    setUploadState({ phase: "saving" });
    try {
      await confirmReceipt({ raw_id: result.raw_id, vendor: editedVendor.trim(), amount: amtNum, date: editedDate, category: editedCategory || null });
      toast.success("Receipt saved.");
      qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
      setShowUploadSheet(false);
      setUploadState({ phase: "idle" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
      setUploadState({ ...uploadState, phase: "review" });
    }
  }

  // ── edit ────────────────────────────────────────────────────────────────────

  function openEdit(expense: ExpenseItem) {
    setEditingExpense(expense);
    setDraftVendor(expense.vendor ?? "");
    setDraftAmount(String(expense.amount));
    setDraftDate(expense.date ?? "");
    setDraftCategory(expense.category ?? "");
  }

  const editMutation = useMutation({
    mutationFn: () => patchExpense(editingExpense!.id, {
      vendor:   draftVendor   || undefined,
      amount:   draftAmount   ? parseFloat(draftAmount) : undefined,
      date:     draftDate     || undefined,
      category: draftCategory || undefined,
    }),

    // Close the sheet and update the list immediately — before the server responds.
    onMutate: async () => {
      const queryKey = ["client", "expenses", month] as const;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);

      const snapshot = {
        id:       editingExpense!.id,
        vendor:   draftVendor   || editingExpense!.vendor,
        amount:   draftAmount   ? parseFloat(draftAmount) : editingExpense!.amount,
        date:     draftDate     || editingExpense!.date,
        category: draftCategory || editingExpense!.category,
      };

      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          expenses: old.expenses.map((e: ExpenseItem) =>
            e.id === snapshot.id ? { ...e, ...snapshot } : e
          ),
        };
      });

      setEditingExpense(null);   // close sheet immediately
      return { previous };
    },

    onSuccess: (result) => {
      toast.success(
        result.flagged_for_review
          ? "Saved — your advisor has been notified."
          : "Saved.",
      );
      // Re-fetch to sync any server-side normalisation (category mapping, etc.)
      qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
    },

    onError: (e, _vars, context) => {
      // Revert the optimistic update
      if (context?.previous) {
        qc.setQueryData(["client", "expenses", month], context.previous);
      }
      toast.error(e instanceof Error ? e.message : "Save failed — please try again.");
    },
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(deletingExpense!.id),
    onSuccess: (result) => {
      if (result.flagged) {
        toast.success("Deletion sent to your advisor for review.");
      } else {
        toast.success("Expense deleted.");
        qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
      }
      setDeletingExpense(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  // ── manual cash ─────────────────────────────────────────────────────────────

  const manualMutation = useMutation({
    mutationFn: () => confirmReceipt({
      raw_id:   null,
      vendor:   manualVendor.trim(),
      amount:   parseFloat(manualAmount),
      date:     manualDate,
      category: manualCategory || null,
    }),
    onSuccess: () => {
      toast.success("Expense added.");
      qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
      setShowManual(false);
      setManualVendor(""); setManualAmount(""); setManualDate(today()); setManualCategory("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  // ── render ──────────────────────────────────────────────────────────────────

  const expenses = data?.expenses ?? [];
  const total    = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.heic,.heif" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-primary">Expenses</h1>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={() => cameraRef.current?.click()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" title="Take photo">
            <Camera className="h-4 w-4" />
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground transition-colors" title="Upload file">
            <Paperclip className="h-4 w-4" />
          </button>
          <button onClick={() => setShowManual(true)}
            className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground transition-colors" title="Add cash expense">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────── */}
      {!isLoading && data && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "expense" : "expenses"} · {monthLabel(month)}
          </span>
          <span className="font-semibold">{fmt(total)}</span>
        </div>
      )}

      {/* ── Expense list ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No expenses for {monthLabel(month)}.</p>
          <button onClick={() => cameraRef.current?.click()} className="mt-3 text-xs text-primary underline-offset-2 hover:underline">
            Upload a receipt to get started
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <ExpenseRow key={e.id} expense={e}
              onEdit={() => openEdit(e)}
              onDelete={() => setDeletingExpense(e)} />
          ))}
        </ul>
      )}

      {/* ── Upload sheet ─────────────────────────────────────────── */}
      <Sheet open={showUploadSheet} onOpenChange={(open) => {
        if (!open && uploadState.phase !== "saving") {
          setShowUploadSheet(false);
          setUploadState({ phase: "idle" });
        }
      }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {uploadState.phase === "uploading" ? "Reading receipt…" :
               uploadState.phase === "review"    ? "Does this look right?" :
               uploadState.phase === "saving"    ? "Saving…" : "Receipt"}
            </SheetTitle>
          </SheetHeader>

          {uploadState.phase === "uploading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your receipt…</p>
            </div>
          )}
          {uploadState.phase === "review" && (
            <ReceiptReviewForm state={uploadState}
              onChange={(field, value) =>
                setUploadState((s) => s.phase === "review" ? { ...s, [field]: value } : s)}
              onConfirm={handleConfirmUpload}
              onCancel={() => { setShowUploadSheet(false); setUploadState({ phase: "idle" }); }} />
          )}
          {uploadState.phase === "saving" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Saving…</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit sheet ────────────────────────────────────────────── */}
      <Sheet open={!!editingExpense} onOpenChange={(open) => { if (!open) setEditingExpense(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Expense</SheetTitle>
          </SheetHeader>
          {editingExpense && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value={draftVendor} onChange={(e) => setDraftVendor(e.target.value)}
                  placeholder={editingExpense.vendor} />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" min="0.01" step="0.01" inputMode="decimal"
                  value={draftAmount} onChange={(e) => setDraftAmount(e.target.value)} />
                {parseFloat(draftAmount) !== editingExpense.amount &&
                  Math.abs(parseFloat(draftAmount) - editingExpense.amount) > 500 && (
                  <p className="text-xs text-accent flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Large change — your advisor will be notified
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={draftCategory} onValueChange={setDraftCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={editingExpense.category || "Select…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <SheetFooter className="mt-6 gap-2 flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setEditingExpense(null)}>Cancel</Button>
            <Button className="flex-1" onClick={() => editMutation.mutate()}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation sheet ─────────────────────────────── */}
      <Sheet open={!!deletingExpense} onOpenChange={(open) => { if (!open) setDeletingExpense(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Delete Expense?</SheetTitle>
          </SheetHeader>
          {deletingExpense && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-xl px-4 py-3 text-sm">
                <div className="font-medium">{deletingExpense.vendor}</div>
                <div className="text-muted-foreground">{fmt(deletingExpense.amount)} · {deletingExpense.date}</div>
              </div>
              {(deletingExpense.source || "").toLowerCase().startsWith("plaid") ? (
                <div className="flex gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>This was imported from your bank. Your advisor will review the deletion before it's applied.</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">This will permanently remove the expense.</p>
              )}
            </div>
          )}
          <SheetFooter className="mt-6 gap-2 flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setDeletingExpense(null)}>Cancel</Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {(deletingExpense?.source || "").toLowerCase().startsWith("plaid")
                ? "Request deletion" : "Delete"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Manual cash expense sheet ─────────────────────────────── */}
      <Sheet open={showManual} onOpenChange={setShowManual}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
          <SheetHeader className="mb-4"><SheetTitle>Add Cash Expense</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input value={manualVendor} onChange={(e) => setManualVendor(e.target.value)} placeholder="e.g. Farmer's Market" />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" min="0.01" step="0.01" inputMode="decimal" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={manualCategory} onValueChange={setManualCategory}>
                <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2 flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setShowManual(false)}>Cancel</Button>
            <Button className="flex-1"
              disabled={manualMutation.isPending || !manualVendor.trim() || !manualAmount || !manualDate}
              onClick={() => manualMutation.mutate()}>
              {manualMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── ExpenseRow ────────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  onEdit,
  onDelete,
}: {
  expense:  ExpenseItem;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const needsCategory = !expense.category;

  return (
    <li className={cn(
      "bg-card border rounded-xl px-4 py-3 flex items-center gap-3",
      needsCategory ? "border-amber-300/60 bg-amber-50/30" : "border-border",
    )}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{expense.vendor}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {needsCategory ? (
            <button onClick={onEdit} className="text-amber-600 underline-offset-2 hover:underline">
              Tap to categorize
            </button>
          ) : (
            <>{expense.category} · {expense.date}</>
          )}
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums shrink-0">{fmt(expense.amount)}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
          title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

// ── ReceiptReviewForm ─────────────────────────────────────────────────────────

type ReviewState = Extract<UploadState, { phase: "review" }>;

function ReceiptReviewForm({
  state, onChange, onConfirm, onCancel,
}: {
  state:     ReviewState;
  onChange:  (field: "editedVendor" | "editedAmount" | "editedDate" | "editedCategory", value: string) => void;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  const { result, editedVendor, editedAmount, editedDate, editedCategory } = state;
  const lowConfidence = result.confidence_score < 0.85;

  return (
    <div className="space-y-4">
      <div className={cn(
        "rounded-xl px-4 py-3 flex items-start gap-3",
        lowConfidence ? "bg-amber-50/60 border border-amber-200" : "bg-primary/5 border border-primary/20",
      )}>
        {lowConfidence
          ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          : <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
        <div className="text-sm">
          {lowConfidence
            ? <><span className="font-medium text-amber-700">I'm not 100% sure</span> — please check the details.</>
            : <><span className="font-medium text-primary">Got it!</span> — does this look right?</>}
          {result.notes && <div className="text-xs text-muted-foreground mt-1">{result.notes}</div>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Amount</Label>
        <Input type="number" min="0.01" step="0.01" inputMode="decimal"
          value={editedAmount} onChange={(e) => onChange("editedAmount", e.target.value)}
          className={lowConfidence ? "" : "text-lg font-semibold"} />
      </div>
      <div className="space-y-2">
        <Label>Vendor</Label>
        <Input value={editedVendor} onChange={(e) => onChange("editedVendor", e.target.value)} placeholder="Vendor name" />
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" value={editedDate} onChange={(e) => onChange("editedDate", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={editedCategory} onValueChange={(v) => onChange("editedCategory", v)}>
          <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={onConfirm}>Yes, save it</Button>
      </div>
    </div>
  );
}
