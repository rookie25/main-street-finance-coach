// Client Portal — Documents shared with your CPA (bidirectional).
// Send any document you receive straight to your CPA, and see what they send back.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, FileText, Download, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { getSharedDocuments, shareDocument, ApiError } from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

function dateLabel(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function sizeLabel(n: number | null): string {
  if (!n) return "";
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function AppDocuments() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "documents"],
    queryFn:  getSharedDocuments,
    staleTime: 30_000,
  });
  const docs = data?.documents ?? [];

  async function handleSend() {
    if (!pendingFile) return;
    setSending(true);
    try {
      await shareDocument(pendingFile, note.trim());
      toast.success("Sent to your CPA ✅");
      setPendingFile(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["client", "documents"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't send — try again");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.heic,.heif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ""; }}
      />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-primary">Documents</h1>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Send any document you receive straight to your CPA — no separate email.
      </p>

      <Button className="w-full h-12" onClick={() => fileRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" /> Share a document with your CPA
      </Button>

      {isError && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No documents yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Share one with your CPA to get started.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => {
            const fromCpa = d.from === "cpa";
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${fromCpa ? "bg-primary/10" : "bg-secondary"}`}>
                  {fromCpa ? <ArrowDownLeft className="h-4 w-4 text-primary" /> : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.filename || "Document"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {fromCpa ? "From your CPA" : "Sent by you"}
                    {d.created_at ? ` · ${dateLabel(d.created_at)}` : ""}
                    {d.size_bytes ? ` · ${sizeLabel(d.size_bytes)}` : ""}
                    {!fromCpa && d.seen_by_cpa ? " · Viewed ✓" : !fromCpa ? " · Sent" : ""}
                  </div>
                  {d.note && <div className="text-xs text-muted-foreground italic mt-0.5 truncate">“{d.note}”</div>}
                </div>
                {d.download_url && (
                  <a
                    href={d.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Note + send sheet */}
      <Sheet open={!!pendingFile} onOpenChange={(o) => { if (!o && !sending) { setPendingFile(null); setNote(""); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Send to your CPA</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 pb-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{pendingFile?.name}</div>
                <div className="text-xs text-muted-foreground">{sizeLabel(pendingFile?.size ?? 0)}</div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Add a note (optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. IRS notice I received today — please take a look"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" disabled={sending}
                onClick={() => { setPendingFile(null); setNote(""); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSend} disabled={sending}>
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : "Send to CPA"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
