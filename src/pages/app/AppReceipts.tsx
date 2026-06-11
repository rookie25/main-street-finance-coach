// Client Portal — Receipts (capture log, separate from the books/Expenses).
// Snap or upload a receipt, then browse everything you've submitted over any
// date range — each with its image and a status (Pending review / Logged).
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, Loader2, Receipt as ReceiptIcon, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { getReceipts, uploadReceipt, confirmReceipt, ApiError, type ReceiptUploadResult } from "@/lib/clientApi";
import { EXPENSE_CATEGORIES } from "@/lib/clientData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import DateRangePicker, { toISODate, type DateRange } from "@/components/DateRangePicker";

function fmt(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function dateLabel(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "review"; result: ReceiptUploadResult; vendor: string; amount: string; date: string; category: string }
  | { phase: "saving" };

export default function AppReceipts() {
  const qc = useQueryClient();

  // Default to the last ~90 days.
  const [range, setRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return { start, end };
  });

  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<UploadState>({ phase: "idle" });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "receipts", toISODate(range.start), toISODate(range.end)],
    queryFn:  () => getReceipts(toISODate(range.start), toISODate(range.end)),
    staleTime: 60_000,
  });
  const receipts = data?.receipts ?? [];

  async function handleFile(file: File) {
    setUpload({ phase: "uploading" });
    try {
      const result = await uploadReceipt(file);
      setUpload({
        phase: "review",
        result,
        vendor:   result.vendor ?? "",
        amount:   result.amount != null ? String(result.amount) : "",
        date:     result.date ?? new Date().toISOString().slice(0, 10),
        category: result.category ?? "",
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't read that receipt — try again");
      setUpload({ phase: "idle" });
    }
  }

  async function handleConfirm() {
    if (upload.phase !== "review") return;
    const amt = parseFloat(upload.amount);
    if (!upload.vendor.trim()) { toast.error("Add a vendor name"); return; }
    if (!upload.date)          { toast.error("Add a date"); return; }
    if (!(amt > 0))            { toast.error("Add a valid amount"); return; }
    const review = upload;
    setUpload({ phase: "saving" });
    try {
      const saved = await confirmReceipt({
        raw_id:   review.result.raw_id,
        vendor:   review.vendor.trim(),
        amount:   amt,
        date:     review.date,
        category: review.category || null,
      });
      toast.success(saved.status === "duplicate"
        ? "Already in your books ✅"
        : "Receipt saved");
      setUpload({ phase: "idle" });
      qc.invalidateQueries({ queryKey: ["client", "receipts"] });
      qc.invalidateQueries({ queryKey: ["client", "expenses"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save — try again");
      setUpload({ ...review });
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/*,application/pdf,.heic,.heif" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-xl font-semibold text-primary">Receipts</h1>
        <DateRangePicker value={range} onChange={setRange} defaultPreset="this_month" />
      </div>

      {/* Capture actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => cameraRef.current?.click()} className="h-12">
          <Camera className="mr-2 h-4 w-4" /> Snap a receipt
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="h-12">
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </div>

      {isError && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      )}

      {/* Receipt list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <ReceiptIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No receipts in this range.</p>
          <p className="text-xs text-muted-foreground mt-1">Snap or upload one to get started.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
              {/* Thumbnail */}
              {r.image_url ? (
                <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img src={r.image_url} alt="" className="h-12 w-12 rounded-lg object-cover bg-muted" loading="lazy" />
                </a>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ImageOff className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{r.vendor || "Receipt"}</span>
                  {r.status === "pending_review" && (
                    <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      Pending review
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dateLabel(r.date)}{r.category ? ` · ${r.category}` : ""}
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">{fmt(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground text-center pb-2">
        Receipts you submit appear here instantly, then flow into your Expenses once finalized.
      </p>

      {/* Upload / review sheet */}
      <Sheet open={upload.phase !== "idle"} onOpenChange={(o) => { if (!o && upload.phase !== "saving") setUpload({ phase: "idle" }); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {upload.phase === "uploading" ? "Reading receipt…" :
               upload.phase === "saving"    ? "Saving…" : "Does this look right?"}
            </SheetTitle>
          </SheetHeader>

          {(upload.phase === "uploading" || upload.phase === "saving") && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {upload.phase === "uploading" ? "Analyzing your receipt…" : "Saving…"}
              </p>
            </div>
          )}

          {upload.phase === "review" && (
            <div className="space-y-3 pb-4">
              {upload.result.receipt_url && (
                <img src={upload.result.receipt_url} alt="" className="w-full max-h-56 object-contain rounded-lg bg-muted" />
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vendor</label>
                <Input value={upload.vendor} onChange={(e) => setUpload({ ...upload, vendor: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <Input inputMode="decimal" value={upload.amount} onChange={(e) => setUpload({ ...upload, amount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input type="date" value={upload.date} onChange={(e) => setUpload({ ...upload, date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={upload.category} onValueChange={(v) => setUpload({ ...upload, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setUpload({ phase: "idle" })}>Cancel</Button>
                <Button className="flex-1" onClick={handleConfirm}>Save receipt</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
