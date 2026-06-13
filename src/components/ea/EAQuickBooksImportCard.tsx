import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { importQuickBooksGL, ApiError, type QbImportResult } from "@/lib/eaApi";

/**
 * Categorization warm-start: seed merchant_rules from a new client's QuickBooks
 * General Ledger export, so their categorization starts accurate instead of
 * cold (every vendor → EA review). Preview (dry-run) lists the rules it would
 * create; Import writes them (deduped; vendors seen < 2× are skipped).
 */
export default function EAQuickBooksImportCard({ schema }: { schema: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<QbImportResult | null>(null);

  async function onFile(f: File) {
    setFileName(f.name);
    setResult(null);
    try { setCsv(await f.text()); } catch { toast.error("Couldn't read that file."); }
  }

  const run = useMutation({
    mutationFn: (dry_run: boolean) => importQuickBooksGL(schema, { csv, dry_run }),
    onSuccess: (res) => {
      setResult(res);
      if (res.dry_run) {
        toast.success(`Preview: ${res.rules_created} rules would be created`);
      } else {
        toast.success(`Seeded ${res.rules_created} categorization rules`);
        qc.invalidateQueries({ queryKey: ["ea", "cat-review", schema] });
      }
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Import failed."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-accent" /> Warm-start categories (QuickBooks GL)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          New client? Upload their QuickBooks <span className="font-medium">General Ledger</span> export
          to seed categorization rules from their prior books — so the first month isn't all review.
        </p>

        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            Choose GL CSV
          </Button>
          <span className="text-xs text-muted-foreground truncate">{fileName || "No file chosen"}</span>
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!csv || run.isPending}
            onClick={() => run.mutate(true)}>
            {run.isPending && run.variables === true ? <Loader2 className="h-3 w-3 animate-spin" /> : "Preview"}
          </Button>
          <Button type="button" size="sm" disabled={!csv || run.isPending}
            onClick={() => run.mutate(false)}>
            {run.isPending && run.variables === false ? <Loader2 className="h-3 w-3 animate-spin" /> : "Seed rules"}
          </Button>
        </div>

        {result && (
          <div className="rounded-xl border border-border p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              {result.dry_run ? "Preview" : "Seeded"}: {result.rules_created} rules
              <span className="text-muted-foreground font-normal">
                · {result.rules_skipped_existing} already exist · {result.rules_skipped_low_freq} too infrequent
              </span>
            </div>
            {result.preview.slice(0, 8).map((p, i) => (
              <div key={i} className="text-muted-foreground truncate">
                {p.vendor} → <span className="text-foreground">{p.pl_category}</span> ({p.confidence})
              </div>
            ))}
            {result.preview.length > 8 && (
              <div className="text-muted-foreground">…and {result.preview.length - 8} more</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
