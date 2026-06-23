import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, HelpCircle, MessageCircleQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getSuspenseQueue, resolveSuspense, askSuspenseOwner, ApiError, type SuspenseGroup,
} from "@/lib/eaApi";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Friendly labels for the GL buckets the backend accepts.
const BUCKET_LABEL: Record<string, string> = {
  EXPENSE:        "Business expense (already booked)",
  EXPENSE_DIRECT: "Business expense (new)",
  DRAW:           "Owner draw",
  LOAN:           "Loan payment",
  CC_PAYMENT:     "Credit card payment",
};

const keyOf = (g: SuspenseGroup) => `${g.merchant}|${g.category}`;

/**
 * GL Suspense review (Phase 3). Lists every bank outflow the double-entry GL
 * couldn't confidently classify (it parks them in Suspense rather than guessing).
 * The EA picks the right bucket; resolving writes a config rule (merchant/category
 * -> bucket) the engine applies on every rebuild, so the item leaves Suspense
 * permanently. Not month-scoped — the queue spans the whole GL history.
 */
export default function EASuspenseReviewCard({ schema }: { schema: string }) {
  const qc = useQueryClient();
  const [picks, setPicks]   = useState<Record<string, string>>({});
  const [notes, setNotes]   = useState<Record<string, string>>({});

  const queueQ = useQuery({
    queryKey: ["ea", "suspense", schema],
    queryFn:  () => getSuspenseQueue(schema),
    enabled:  !!schema,
  });

  const resolve = useMutation({
    mutationFn: (g: SuspenseGroup) =>
      resolveSuspense(schema, {
        merchant: g.merchant || undefined,
        category: g.category || undefined,
        bucket:   picks[keyOf(g)],
        note:     notes[keyOf(g)] || undefined,
      }),
    onSuccess: (res) => {
      const n = res.cleared_count;
      toast.success(
        "Reclassified · rule saved for next time" +
        (typeof n === "number" ? ` · clears ${n} item${n === 1 ? "" : "s"} on next rebuild` : ""),
      );
      qc.invalidateQueries({ queryKey: ["ea", "suspense", schema] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not resolve the item."),
  });

  const ask = useMutation({
    mutationFn: (vars: { g: SuspenseGroup; question: string }) =>
      askSuspenseOwner(schema, {
        merchant: vars.g.merchant || undefined,
        category: vars.g.category || undefined,
        question: vars.question || undefined,
      }),
    onSuccess: () => {
      toast.success("Asked the owner — they’ll see it on their dashboard.");
      qc.invalidateQueries({ queryKey: ["ea", "suspense", schema] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not send the question."),
  });

  const data    = queueQ.data;
  const groups  = useMemo(() => data?.groups ?? [], [data]);
  const buckets = data?.resolve_buckets ?? ["EXPENSE", "DRAW", "LOAN", "CC_PAYMENT"];

  // Pre-select the bucket the owner's answer suggests, so the EA just confirms.
  useEffect(() => {
    if (!groups.length) return;
    setPicks((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        const k = keyOf(g);
        const sug = g.clarification?.suggested_bucket;
        if (sug && !next[k]) next[k] = sug;
      }
      return next;
    });
  }, [groups]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Suspense to classify
          {groups.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({groups.length} item{groups.length === 1 ? "" : "s"} · {money(data?.total_amount ?? 0)})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {queueQ.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {queueQ.isError && (
          <p className="text-sm text-muted-foreground">
            Couldn’t load the suspense queue right now.
          </p>
        )}

        {!queueQ.isLoading && !queueQ.isError && groups.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Nothing in suspense — every outflow is classified.
          </p>
        )}

        {groups.map((g) => {
          const k = keyOf(g);
          const picked = picks[k] ?? "";
          const pending = resolve.isPending && resolve.variables === g;
          return (
            <div key={k} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{g.merchant || "(no merchant)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {money(g.amount)} · {g.count} txn{g.count === 1 ? "" : "s"} · Plaid:{" "}
                    <span className="text-foreground">{g.category || "—"}</span>
                  </div>
                </div>
                {/* Owner-knowledge loop: ask, or show what the owner said. */}
                {g.clarification?.owner_answer || g.clarification?.suggested_bucket ? null
                  : g.clarification?.status === "asked" ? (
                    <span className="shrink-0 text-[11px] text-amber-600 inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3" /> Asked owner
                    </span>
                  ) : (
                    <Button
                      type="button" size="sm" variant="outline"
                      className="shrink-0 h-7 text-xs gap-1"
                      disabled={ask.isPending && ask.variables?.g === g}
                      onClick={() => {
                        const q = window.prompt(
                          `Ask the owner about "${g.merchant || g.category}":`,
                          "What was this payment for?",
                        );
                        if (q !== null) ask.mutate({ g, question: q });
                      }}
                    >
                      <MessageCircleQuestion className="h-3.5 w-3.5" /> Ask owner
                    </Button>
                  )}
              </div>
              {g.clarification?.owner_answer && (
                <p className="text-xs rounded-md bg-muted/50 px-2 py-1.5">
                  <span className="text-muted-foreground">Owner said: </span>
                  <span className="text-foreground">{g.clarification.owner_answer}</span>
                  {g.clarification.suggested_bucket && (
                    <span className="text-muted-foreground">
                      {" "}→ suggests {BUCKET_LABEL[g.clarification.suggested_bucket] ?? g.clarification.suggested_bucket}
                    </span>
                  )}
                </p>
              )}
              <div className="flex items-center gap-2">
                <select
                  value={picked}
                  onChange={(e) => setPicks((p) => ({ ...p, [k]: e.target.value }))}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Classify as…</option>
                  {buckets.map((b) => (
                    <option key={b} value={b}>{BUCKET_LABEL[b] ?? b}</option>
                  ))}
                </select>
                <Button
                  type="button" size="sm"
                  disabled={!picked || pending}
                  onClick={() => resolve.mutate(g)}
                >
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resolve"}
                </Button>
              </div>
              <input
                type="text"
                value={notes[k] ?? ""}
                onChange={(e) => setNotes((p) => ({ ...p, [k]: e.target.value }))}
                placeholder="Note (optional) — e.g. what this payment is"
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
          );
        })}

        {data?.resolutions && data.resolutions.length > 0 && (
          <details className="text-xs text-muted-foreground pt-1">
            <summary className="cursor-pointer flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" /> Resolution history ({data.resolutions.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {data.resolutions.map((r) => (
                <li key={r.id} className="flex flex-wrap gap-x-2">
                  <span className="text-foreground">{r.merchant || r.category || "—"}</span>
                  → {BUCKET_LABEL[r.bucket] ?? r.bucket}
                  {r.note ? ` · “${r.note}”` : ""}
                  <span className="opacity-70">
                    · {r.resolved_by_email ?? "EA"} · {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
