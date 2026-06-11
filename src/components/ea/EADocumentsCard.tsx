// EA portal — shared documents for a client (client <-> CPA), with upload.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { getClientDocuments, shareDocumentToClient } from "@/lib/eaApi";
import { Button } from "@/components/ui/button";

export default function EADocumentsCard({ schema }: { schema: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ea", "documents", schema],
    queryFn:  () => getClientDocuments(schema),
    enabled:  !!schema,
    staleTime: 30_000,
  });
  const docs = data?.documents ?? [];

  async function onFile(file: File) {
    setSending(true);
    try {
      await shareDocumentToClient(schema, file, "");
      toast.success("Sent to client");
      qc.invalidateQueries({ queryKey: ["ea", "documents", schema] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <input ref={fileRef} type="file"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Documents{docs.length ? ` (${docs.length})` : ""}</h3>
        <Button size="sm" variant="outline" disabled={sending} onClick={() => fileRef.current?.click()}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="mr-1.5 h-3.5 w-3.5" /> Send to client</>}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No shared documents yet. The client can send documents here, and you can send signed forms back.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              {d.from === "client"
                ? <ArrowDownLeft className="h-3.5 w-3.5 text-primary shrink-0" />
                : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <span className="flex-1 min-w-0 truncate" title={d.note ?? undefined}>
                {d.filename || "Document"}{d.note ? ` — ${d.note}` : ""}
              </span>
              {d.download_url && (
                <a href={d.download_url} target="_blank" rel="noopener noreferrer"
                   className="shrink-0 text-muted-foreground hover:text-foreground" title="Download">
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
