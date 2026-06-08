// Client Portal — Reports (Component 4).
// Month dropdown → signed PDF URL → inline iframe + download button.
// Mirrors the EAClient PDF viewer pattern.
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2 } from "lucide-react";
import { getReports, asDownloadUrl } from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AppReports() {
  const [month, setMonth] = useState(currentMonth);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "reports", month],
    queryFn:  () => getReports(month),
  });

  // When the report list loads and current month has no PDF, default to newest available.
  useEffect(() => {
    if (data?.available_months?.length && !data.pnl_pdf_url) {
      const newest = data.available_months[0];
      if (newest && newest !== month) setMonth(newest);
    }
  }, [data?.available_months, month]);

  const availableMonths = data?.available_months ?? [];
  const hasPnl = !!data?.pnl_pdf_url;
  const hasBs  = !!data?.balance_sheet_pdf_url;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-primary">Reports</h1>
        {isLoading ? (
          <Skeleton className="h-9 w-36" />
        ) : availableMonths.length > 0 ? (
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isError && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      )}

      {/* ── No reports yet ─────────────────────────────────────── */}
      {!isLoading && availableMonths.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No reports available yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Monthly PDFs are generated at month-end.
          </p>
        </div>
      )}

      {/* ── Report not found for selected month ────────────────── */}
      {!isLoading && availableMonths.length > 0 && !hasPnl && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No report available for {monthLabel(month)}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try selecting a different month.
          </p>
        </div>
      )}

      {/* ── P&L PDF ────────────────────────────────────────────── */}
      {hasPnl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">P&amp;L Report — {monthLabel(month)}</span>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={asDownloadUrl(data!.pnl_pdf_url!, `groundstack_${month}_pl.pdf`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </a>
            </Button>
          </div>
          <div className="rounded-xl overflow-hidden border border-border bg-card">
            <iframe
              src={data!.pnl_pdf_url!}
              title={`P&L ${monthLabel(month)}`}
              className="w-full"
              style={{ height: "70dvh", minHeight: 400 }}
            />
          </div>
        </div>
      )}

      {/* ── Balance sheet PDF (if separate) ────────────────────── */}
      {hasBs && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Balance Sheet — {monthLabel(month)}</span>
            <Button variant="outline" size="sm" asChild>
              <a
                href={asDownloadUrl(data!.balance_sheet_pdf_url!, `groundstack_${month}_bs.pdf`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </a>
            </Button>
          </div>
          <div className="rounded-xl overflow-hidden border border-border bg-card">
            <iframe
              src={data!.balance_sheet_pdf_url!}
              title={`Balance Sheet ${monthLabel(month)}`}
              className="w-full"
              style={{ height: "50dvh", minHeight: 300 }}
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="w-full rounded-xl" style={{ height: "60dvh" }} />
        </div>
      )}
    </div>
  );
}
