import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importPosSales, ApiError, type PosImportResult } from "@/lib/eaApi";

/**
 * EA tool: import a client's POS sales report (CSV) as revenue — the non-Square
 * path that works for any industry's POS (Toast, Vagaro, Shopify, …). Preview
 * (dry-run) shows the parsed totals + which columns were detected; Import writes
 * to transactions (idempotent — re-importing the same file is a no-op).
 */
export default function EAPosImportCard({ schema }: { schema: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [result, setResult] = useState<PosImportResult | null>(null);

  async function onFile(f: File) {
    setFileName(f.name);
    setResult(null);
    try {
      setCsv(await f.text());
    } catch {
      toast.error("Couldn't read that file.");
    }
  }

  const run = useMutation({
    mutationFn: (dry_run: boolean) =>
      importPosSales(schema, {
        csv,
        source_label: sourceLabel.trim() || undefined,
        dry_run,
      }),
    onSuccess: (res) => {
      setResult(res);
      if (res.dry_run) {
        toast.success(`Preview: ${res.normalized} sales, $${res.revenue_total.toLocaleString()}`);
      } else {
        toast.success(`Imported ${res.inserted} sales` +
          (res.skipped_duplicate ? ` · ${res.skipped_duplicate} already present` : ""));
        qc.invalidateQueries({ queryKey: ["ea", "pnl", schema] });
      }
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Import failed."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4 text-accent" /> Import POS sales (CSV)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          For clients not on Square — upload a sales export (Toast, Vagaro, Shopify, …).
          Needs at least a <span className="font-medium">date</span> and an{" "}
          <span className="font-medium">amount</span> column.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            Choose CSV
          </Button>
          <span className="text-xs text-muted-foreground truncate">{fileName || "No file chosen"}</span>
        </div>

        <Input
          value={sourceLabel}
          onChange={(e) => setSourceLabel(e.target.value)}
          placeholder="Source label (e.g. Toast, Vagaro) — optional"
          className="h-9 text-sm"
        />

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!csv || run.isPending}
            onClick={() => run.mutate(true)}>
            {run.isPending && run.variables === true ? <Loader2 className="h-3 w-3 animate-spin" /> : "Preview"}
          </Button>
          <Button type="button" size="sm" disabled={!csv || run.isPending}
            onClick={() => run.mutate(false)}>
            {run.isPending && run.variables === false ? <Loader2 className="h-3 w-3 animate-spin" /> : "Import"}
          </Button>
        </div>

        {result && (
          <div className="rounded-xl border border-border p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              {result.dry_run ? "Preview" : "Imported"} · {result.source}
            </div>
            <div className="text-muted-foreground">
              {result.normalized} sales · ${result.revenue_total.toLocaleString()} revenue
              {!result.dry_run && ` · ${result.inserted} new`}
              {!result.dry_run && result.skipped_duplicate ? ` · ${result.skipped_duplicate} already present` : ""}
            </div>
            <div className="text-muted-foreground">
              Columns detected: {Object.entries(result.resolved_columns).map(([k, v]) => `${k}→${v}`).join(", ") || "none"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
