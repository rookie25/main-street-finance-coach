// EA Portal — Month-end readiness checklist (#5 B-Phase 1).
// Read-only assembly of existing close signals (verification, categorization,
// flags, cash/revenue/GL reconciliation, approval). Computes nothing new.
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, ClipboardCheck, Loader2 } from "lucide-react";
import { getCloseReadiness, type CloseCheck } from "@/lib/eaApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StatusIcon({ status }: { status: CloseCheck["status"] }) {
  if (status === "ok")      return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  if (status === "blocker") return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
}

export default function EACloseReadinessCard({ schema, month }: { schema: string; month: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ea", "close-readiness", schema, month],
    queryFn:  () => getCloseReadiness(schema, month),
    enabled:  !!schema && !!month,
    staleTime: 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ClipboardCheck className="h-4 w-4" /> Month-end readiness
          </span>
          {data && (
            data.approved ? (
              <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">Approved</Badge>
            ) : data.ready ? (
              <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">Ready to close</Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">
                {data.blocker_count} blocker{data.blocker_count === 1 ? "" : "s"}
              </Badge>
            )
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground py-2">Couldn't load readiness.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              {data.score !== null && (
                <div className="text-2xl font-bold text-primary">{data.score}%</div>
              )}
              <div className="text-xs text-muted-foreground">
                {data.warning_count > 0 && <span>{data.warning_count} to review · </span>}
                {data.ready ? "No blockers" : `${data.blocker_count} must fix before close`}
              </div>
            </div>
            <ul className="space-y-2">
              {data.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  <StatusIcon status={c.status} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground mt-3">
              Summary of existing checks — review each tool below before approving.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
