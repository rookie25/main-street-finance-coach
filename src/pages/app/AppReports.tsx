// Client Portal — Reports (Component 4).
// DateRangePicker → signed PDF URLs for each month in range → inline viewer + download.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { getReportsRange, asDownloadUrl, type ReportForRange } from "@/lib/clientApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DateRangePicker, {
  computePreset,
  toISODate,
  type DateRange,
} from "@/components/DateRangePicker";

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function AppReports() {
  const [range, setRange] = useState<DateRange>(() => computePreset("this_month"));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "reports", toISODate(range.start), toISODate(range.end)],
    queryFn:  () => getReportsRange(toISODate(range.start), toISODate(range.end)),
  });

  const reports = data?.reports ?? [];
  const hasReports = reports.length > 0;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-primary">Reports</h1>
        <DateRangePicker
          value={range}
          onChange={setRange}
          defaultPreset="this_month"
        />
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      )}

      {/* ── Loading ─────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="w-full rounded-xl" style={{ height: "60dvh" }} />
        </div>
      )}

      {/* ── No reports in range ─────────────────────────────────── */}
      {!isLoading && !isError && !hasReports && (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No reports found for the selected period.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Monthly PDFs are generated at month-end.
          </p>
        </div>
      )}

      {/* ── Report cards ────────────────────────────────────────── */}
      {!isLoading && reports.map((report) => (
        <ReportCard key={report.month} report={report} />
      ))}
    </div>
  );
}

function ReportCard({ report }: { report: ReportForRange }) {
  const { month, pnl_pdf_url, balance_sheet_pdf_url } = report;
  const [expanded, setExpanded] = useState(true);

  if (!pnl_pdf_url) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden space-y-0">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">{monthLabel(month)}</span>
        <div className="flex items-center gap-2">
          {balance_sheet_pdf_url && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={asDownloadUrl(balance_sheet_pdf_url, `groundstack_${month}_bs.pdf`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Balance Sheet
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a
              href={asDownloadUrl(pnl_pdf_url, `groundstack_${month}_pl.pdf`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> P&amp;L
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-muted-foreground"
          >
            {expanded ? "Collapse" : "View"}
          </Button>
        </div>
      </div>

      {/* Inline PDF viewer */}
      {expanded && (
        <iframe
          src={pnl_pdf_url}
          title={`P&L ${monthLabel(month)}`}
          className="w-full"
          style={{ height: "70dvh", minHeight: 400 }}
        />
      )}
    </div>
  );
}
