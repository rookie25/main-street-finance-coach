import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getCategorizationReview, applyCategorization,
  ApiError, type CategorizationGroup,
} from "@/lib/eaApi";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * EA categorization review (#9 Phase 2). Lists LOW-confidence expense
 * categorizations for the month, grouped by vendor. The EA picks the correct
 * chart-of-accounts line; applying it creates a merchant_rule (so the vendor is
 * categorized correctly from now on) and fixes this month's rows immediately.
 */
export default function EACategorizationReviewCard({
  schema, month,
}: { schema: string; month: string }) {
  const qc = useQueryClient();
  const [picks, setPicks] = useState<Record<string, string>>({});

  const reviewQ = useQuery({
    queryKey: ["ea", "cat-review", schema, month],
    queryFn:  () => getCategorizationReview(schema, month),
    enabled:  !!schema && !!month,
  });

  const apply = useMutation({
    mutationFn: (g: CategorizationGroup) =>
      applyCategorization(schema, {
        period:       month,
        pl_category:  picks[keyOf(g)],
        raw_merchant: g.raw_merchant ?? undefined,
        expense_ids:  g.raw_merchant ? undefined : g.expense_ids,
        create_rule:  true,
      }),
    onSuccess: (res) => {
      toast.success(
        `Recategorized to ${res.pl_category}` +
        (res.rule_created ? " · rule saved for next time" : "") +
        ` · ${res.updated_rows} row${res.updated_rows === 1 ? "" : "s"} updated`,
      );
      qc.invalidateQueries({ queryKey: ["ea", "cat-review", schema, month] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not apply the change."),
  });

  if (!month) return null;

  const data    = reviewQ.data;
  const groups  = data?.groups ?? [];
  const cats    = data?.categories ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Categorizations to review
          {groups.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({groups.length} vendor{groups.length === 1 ? "" : "s"})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewQ.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {data?.note && (
          <p className="text-xs text-muted-foreground">{data.note}</p>
        )}

        {!reviewQ.isLoading && !data?.note && groups.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> All categorizations look confident for this month.
          </p>
        )}

        {groups.map((g) => {
          const k = keyOf(g);
          const picked = picks[k] ?? "";
          return (
            <div key={k} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{g.vendor || g.raw_merchant || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">
                    {money(g.total_amount)} · {g.count} txn{g.count === 1 ? "" : "s"} · currently{" "}
                    <span className="text-foreground">{g.current_category || "—"}</span>
                    {g.category_source ? ` (${g.category_source})` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={picked}
                  onChange={(e) => setPicks((p) => ({ ...p, [k]: e.target.value }))}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Select correct category…</option>
                  {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={!picked || (apply.isPending && apply.variables === g)}
                  onClick={() => apply.mutate(g)}
                >
                  {apply.isPending && apply.variables === g
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : "Apply"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function keyOf(g: CategorizationGroup): string {
  return g.raw_merchant || g.vendor || g.expense_ids.join(",");
}
