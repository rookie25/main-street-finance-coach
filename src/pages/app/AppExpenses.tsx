// Client Portal — Expenses & Receipts (Component 4, Session 3).
//
// Permission model:
//   ✅ Edit vendor, date, category, notes freely (PATCH /client/expense/{id})
//   ✅ Upload receipts — photo, camera, PDF, file
//   ✅ Add cash expenses manually
//   ⏳ Amount change → "Request Correction" → goes to EA queue
//   ❌ Amount field always read-only
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Paperclip, Camera, Pencil, RotateCcw, Loader2, AlertTriangle,
  CheckCircle2, ChevronRight, Plus, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getExpenses, getMe, uploadReceipt, confirmReceipt, patchExpense,
  requestCorrection, type ExpenseItem, type ReceiptUploadResult,
} from "@/lib/clientApi";
import { EXPENSE_CATEGORIES } from "@/lib/clientData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  | { phase: "saving" }
  | { phase: "done" };

// ── main component ────────────────────────────────────────────────────────────

export default function AppExpenses() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [month, setMonth] = useState(currentMonth);
  const [uploadState, setUploadState] = useState<UploadState>({ phase: "idle" });
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // Edit existing expense
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [draftVendor,    setDraftVendor]    = useState("");
  const [draftDate,      setDraftDate]      = useState("");
  const [draftCategory,  setDraftCategory]  = useState("");

  // Request correction (amount change / delete)
  const [correctionTarget,  setCorrectionTarget]  = useState<ExpenseItem | null>(null);
  const [correctionType,    setCorrectionType]    = useState<"amount_change" | "delete">("amount_change");
  const [correctionAmount,  setCorrectionAmount]  = useState("");
  const [correctionNote,    setCorrectionNote]    = useState("");

  // Manual cash expense
  const [showManual,      setShowManual]      = useState(false);
  const [manualVendor,    setManualVendor]    = useState("");
  const [manualAmount,    setManualAmount]    = useState("");
  const [manualDate,      setManualDate]      = useState(today);
  const [manualCategory,  setManualCategory]  = useState("");

  const { data: meData } = useQuery({ queryKey: ["client", "me"], queryFn: getMe });
  const clientSchema = meData?.client_schema ?? "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "expenses", month],
    queryFn:  () => getExpenses(month),
    enabled:  !!month,
  });

  // ── upload flow ─────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setShowUploadSheet(true);
    setUploadState({ phase: "uploading" });
    try {
      const result = await uploadReceipt(file);
      setUploadState({
        phase:          "review",
        result,
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
    const amountNum = parseFloat(editedAmount);
    if (!editedVendor.trim()) { toast.error("Vendor name is required"); return; }
    if (isNaN(amountNum) || amountNum <= 0) { toast.error("Enter a valid amount"); return; }
    if (!editedDate) { toast.error("Date is required"); return; }

    setUploadState({ phase: "saving" });
    try {
      await confirmReceipt({
        raw_id:   result.raw_id,
        vendor:   editedVendor.trim(),
        amount:   amountNum,
        date:     editedDate,
        category: editedCategory || null,
      });
      toast.success("Receipt saved.");
      qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
      setShowUploadSheet(false);
      setUploadState({ phase: "done" });
      setTimeout(() => setUploadState({ phase: "idle" }), 300);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
      setUploadState({ ...uploadState, phase: "review" });
    }
  }

  // ── edit existing expense ───────────────────────────────────────────────────

  function openEdit(expense: ExpenseItem) {
    setEditingExpense(expense);
    setDraftVendor(expense.vendor ?? "");
    setDraftDate(expense.date ?? "");
    setDraftCategory(expense.category ?? "");
  }

  const editMutation = useMutation({
    mutationFn: () => patchExpense(editingExpense!.id, {
      vendor:   draftVendor   || undefined,
      date:     draftDate     || undefined,
      category: draftCategory || undefined,
    }),
    onSuccess: () => {
      toast.success("Changes saved.");
      qc.invalidateQueries({ queryKey: ["client", "expenses", month] });
      setEditingExpense(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  // ── request correction ──────────────────────────────────────────────────────

  function openCorrection(expense: ExpenseItem, type: "amount_change" | "delete") {
    setCorrectionTarget(expense);
    setCorrectionType(type);
    setCorrectionAmount("");
    setCorrectionNote("");
  }

  const correctionMutation = useMutation({
    mutationFn: () => requestCorrection({
      expense_id:     correctionTarget!.id,
      request_type:   correctionType,
      correct_amount: correctionType === "amount_change" ? parseFloat(correctionAmount) : undefined,
      client_note:    correctionNote || undefined,
    }),
    onSuccess: () => {
      toast.success("Request submitted to your advisor.");
      setCorrectionTarget(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed."),
  });

  // ── manual cash expense ─────────────────────────────────────────────────────

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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.heic,.heif"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-primary">Expenses</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {/* Upload buttons */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            title="Take photo"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground transition-colors"
            title="Upload file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground transition-colors"
            title="Add cash expense"
          >
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
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No expenses for {monthLabel(month)}.</p>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="mt-3 text-xs text-primary underline-offset-2 hover:underline"
          >
            Upload a receipt to get started
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              onEdit={() => openEdit(e)}
              onRequestCorrection={(type) => openCorrection(e, type)}
            />
          ))}
        </ul>
      )}

      {/* ── Upload / review sheet ────────────────────────────────── */}
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
            <ReceiptReviewForm
              state={uploadState}
              onChange={(field, value) =>
                setUploadState((s) => s.phase === "review" ? { ...s, [field]: value } : s)
              }
              onConfirm={handleConfirmUpload}
              onCancel={() => { setShowUploadSheet(false); setUploadState({ phase: "idle" }); }}
            />
          )}

          {uploadState.phase === "saving" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Saving expense…</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit existing expense sheet ──────────────────────────── */}
      <Sheet open={!!editingExpense} onOpenChange={(open) => { if (!open) setEditingExpense(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Expense</SheetTitle>
          </SheetHeader>
          {editingExpense && (
            <div className="space-y-4">
              {/* Amount: always read-only */}
              <div className="bg-secondary rounded-xl px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-semibold">{fmt(editingExpense.amount)}</span>
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    onClick={() => { setEditingExpense(null); openCorrection(editingExpense, "amount_change"); }}
                    className="text-xs text-accent underline-offset-2 hover:underline"
                  >
                    Request correction
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={draftVendor}
                  onChange={(e) => setDraftVendor(e.target.value)}
                  placeholder={editingExpense.vendor_original ?? editingExpense.vendor}
                />
              </div>
              <div className="space-y-2">
                <Label>Receipt Date</Label>
                <Input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={draftCategory} onValueChange={setDraftCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={editingExpense.category_original || "Select…"} />
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
            <Button variant="outline" className="flex-1" onClick={() => setEditingExpense(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={editMutation.isPending}
              onClick={() => editMutation.mutate()}
            >
              {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Request Correction sheet ─────────────────────────────── */}
      <Sheet open={!!correctionTarget} onOpenChange={(open) => { if (!open) setCorrectionTarget(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Request Correction</SheetTitle>
          </SheetHeader>
          {correctionTarget && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-xl px-4 py-3 text-sm">
                <div className="text-muted-foreground mb-1">Current expense</div>
                <div className="font-medium">{correctionTarget.vendor}</div>
                <div className="text-muted-foreground">
                  {fmt(correctionTarget.amount)} · {correctionTarget.date}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCorrectionType("amount_change")}
                  className={cn(
                    "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                    correctionType === "amount_change"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  Wrong amount
                </button>
                <button
                  onClick={() => setCorrectionType("delete")}
                  className={cn(
                    "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                    correctionType === "delete"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  Delete expense
                </button>
              </div>

              {correctionType === "amount_change" && (
                <div className="space-y-2">
                  <Label>Correct amount ($)</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={correctionAmount}
                    onChange={(e) => setCorrectionAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Your note (optional)</Label>
                <Textarea
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  placeholder="e.g. Receipt shows $23.50, not $230.50"
                  rows={2}
                />
              </div>
            </div>
          )}
          <SheetFooter className="mt-6 gap-2 flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setCorrectionTarget(null)}>
              Cancel
            </Button>
            <Button
              className={cn("flex-1", correctionType === "delete" && "bg-destructive hover:bg-destructive/90")}
              disabled={correctionMutation.isPending || (correctionType === "amount_change" && !correctionAmount)}
              onClick={() => correctionMutation.mutate()}
            >
              {correctionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit to advisor
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Manual cash expense sheet ─────────────────────────────── */}
      <Sheet open={showManual} onOpenChange={setShowManual}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Add Cash Expense</SheetTitle>
          </SheetHeader>
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
            <Button
              className="flex-1"
              disabled={manualMutation.isPending || !manualVendor.trim() || !manualAmount || !manualDate}
              onClick={() => manualMutation.mutate()}
            >
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
  onRequestCorrection,
}: {
  expense: ExpenseItem;
  onEdit: () => void;
  onRequestCorrection: (type: "amount_change" | "delete") => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const needsCategory = !expense.category;

  return (
    <li className={cn(
      "bg-card border rounded-xl px-4 py-3",
      needsCategory ? "border-amber-300/60 bg-amber-50/30" : "border-border",
    )}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate">{expense.vendor}</span>
            {needsCategory && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600 shrink-0">
                needs category
              </Badge>
            )}
          </div>
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

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-semibold tabular-nums">{fmt(expense.amount)}</span>
          <button
            onClick={() => setShowActions((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inline action tray */}
      {showActions && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
          <button
            onClick={() => { setShowActions(false); onEdit(); }}
            className="flex-1 text-xs rounded-lg border border-border py-2 hover:bg-secondary transition-colors"
          >
            Edit vendor / date / category
          </button>
          <button
            onClick={() => { setShowActions(false); onRequestCorrection("amount_change"); }}
            className="flex-1 text-xs rounded-lg border border-border py-2 hover:bg-secondary transition-colors text-accent"
          >
            Wrong amount?
          </button>
          <button
            onClick={() => { setShowActions(false); onRequestCorrection("delete"); }}
            className="text-xs rounded-lg border border-destructive/30 px-3 py-2 hover:bg-destructive/5 transition-colors text-destructive"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

// ── ReceiptReviewForm ─────────────────────────────────────────────────────────

type ReviewState = Extract<UploadState, { phase: "review" }>;

function ReceiptReviewForm({
  state,
  onChange,
  onConfirm,
  onCancel,
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
      {/* Confirmation header */}
      <div className={cn(
        "rounded-xl px-4 py-3 flex items-start gap-3",
        lowConfidence ? "bg-amber-50/60 border border-amber-200" : "bg-primary/5 border border-primary/20",
      )}>
        {lowConfidence
          ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          : <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        }
        <div className="text-sm">
          {lowConfidence
            ? <><span className="font-medium text-amber-700">I'm not 100% sure</span> — please review the details below.</>
            : <><span className="font-medium text-primary">Got it!</span> — does this look right?</>
          }
          {result.notes && <div className="text-xs text-muted-foreground mt-1">{result.notes}</div>}
        </div>
      </div>

      {/* Amount — editable if low confidence, otherwise shown clearly */}
      <div className="space-y-2">
        <Label>Amount</Label>
        {lowConfidence ? (
          <Input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={editedAmount}
            onChange={(e) => onChange("editedAmount", e.target.value)}
            className="text-lg font-semibold"
          />
        ) : (
          <div className="bg-secondary rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-lg font-bold">
              {editedAmount ? fmt(parseFloat(editedAmount)) : "—"}
            </span>
            <button
              onClick={() => onChange("editedAmount", "")}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Change
            </button>
          </div>
        )}
        {/* Show editable field if they clicked "Change" */}
        {!lowConfidence && editedAmount === "" && (
          <Input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            autoFocus
            placeholder="Enter amount"
            onChange={(e) => onChange("editedAmount", e.target.value)}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Vendor</Label>
        <Input
          value={editedVendor}
          onChange={(e) => onChange("editedVendor", e.target.value)}
          placeholder="Vendor name"
        />
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={editedDate}
          onChange={(e) => onChange("editedDate", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={editedCategory} onValueChange={(v) => onChange("editedCategory", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category…" />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={onConfirm}>
          Yes, save it
        </Button>
      </div>
    </div>
  );
}
