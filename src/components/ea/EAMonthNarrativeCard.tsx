// EA Portal — AI-drafted month-end summary (MD&A), #5 B-Phase 2.
// On-demand (one LLM call on click). Grounded in the month's real figures by the
// backend; shown as an EDITABLE draft the EA reviews before sharing.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { getCloseNarrative } from "@/lib/eaApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function EAMonthNarrativeCard({ schema, month }: { schema: string; month: string }) {
  const [text, setText] = useState("");
  const [generated, setGenerated] = useState(false);

  const gen = useMutation({
    mutationFn: () => getCloseNarrative(schema, month),
    onSuccess: (data) => {
      if (data.narrative) {
        setText(data.narrative);
        setGenerated(true);
      } else {
        toast.message(data.note ?? "No financial data for this month yet.");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not generate summary."),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> Month summary (AI draft)
          </span>
          {month && (
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => gen.mutate()} disabled={gen.isPending}
            >
              {gen.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Generating…</>
                : generated ? "Regenerate" : "Generate"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!generated && !gen.isPending ? (
          <p className="text-sm text-muted-foreground py-2">
            Draft a plain-English month-end summary from this month's figures — review and edit before sharing.
          </p>
        ) : (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="text-sm"
              placeholder="Generating…"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-muted-foreground">
                AI-drafted from this month's figures — review & edit before sharing.
              </p>
              <Button
                size="sm" variant="ghost" className="h-7 text-xs gap-1"
                onClick={() => { void navigator.clipboard.writeText(text); toast.success("Copied"); }}
                disabled={!text}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
