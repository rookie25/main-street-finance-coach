// EA Portal per-client view (Component 3).
// Left: monthly P&L / balance-sheet PDF (inline + download). Right: the EA's
// Layer-2 tools — approve the month, flag line items, override categories, and
// keep a monthly note. Financial PDFs come from the backend (signed URLs);
// flags/approvals/overrides/notes read & write Supabase directly under RLS.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Check, CheckCircle2, Download, FileText, Flag,
  Loader2, ShieldCheck, ShieldAlert, Trash2, Undo2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  getClientMonths, getClientPnl, listClients, asDownloadUrl, downloadQuickBooks,
  getPendingAdjustments, approveAdjustment, rejectAdjustment, getEAFlags,
  getVerificationFlags, resolveVerificationFlag, approveMonthViaBackend,
  type PendingAdjustment, type EAFlagEnriched, type VerificationFlag,
} from "@/lib/eaApi";
import {
  deleteOverride, getApproval, getNote, getOverrides,
  saveNote, setFlagResolved, setOverride, unapproveMonth, EXPENSE_CATEGORIES,
} from "@/lib/eaData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import EAMessagesCard from "@/components/ea/EAMessagesCard";
import EADocumentsCard from "@/components/ea/EADocumentsCard";
import EAReceivablesCard from "@/components/ea/EAReceivablesCard";
import EACategorizationReviewCard from "@/components/ea/EACategorizationReviewCard";
import EASuspenseReviewCard from "@/components/ea/EASuspenseReviewCard";
import EACloseReadinessCard from "@/components/ea/EACloseReadinessCard";
import EAMonthNarrativeCard from "@/components/ea/EAMonthNarrativeCard";
import EAPosImportCard from "@/components/ea/EAPosImportCard";
import EAQuickBooksImportCard from "@/components/ea/EAQuickBooksImportCard";
import EAOpeningBalanceCard from "@/components/ea/EAOpeningBalanceCard";
import EAWorksheet from "@/components/ea/EAWorksheet";
import DateRangePicker, {
  computePreset,
  toISODate,
  type DateRange,
} from "@/components/DateRangePicker";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function monthLabel(m: string): string {
  // 'YYYY-MM' -> 'April 2026'
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function EAClient() {
  const { schema = "" } = useParams();
  const qc = useQueryClient();
  const [range, setRange] = useState<DateRange>(() => computePreset("last_month"));
  const [month, setMonth] = useState<string>("");

  // Client display info comes from the (cached) sidebar list.
  const { data: clients } = useQuery({ queryKey: ["ea", "clients"], queryFn: listClients });
  const client = clients?.find((c) => c.client_schema === schema);

  // Available report months filtered by selected range.
  const monthsQ = useQuery({
    queryKey: ["ea", "months", schema, toISODate(range.start), toISODate(range.end)],
    queryFn: () => getClientMonths(schema, toISODate(range.start), toISODate(range.end)),
    enabled: !!schema,
  });

  // Use the first (newest) month in the filtered list for per-month cards.
  useEffect(() => {
    const months = monthsQ.data?.months ?? [];
    setMonth(months[0] ?? "");
  }, [monthsQ.data, schema]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent">Client</div>
          <h1 className="font-display text-2xl font-semibold text-primary">
            {client?.business_name ?? schema}
          </h1>
        </div>
        <DateRangePicker
          value={range}
          onChange={setRange}
          defaultPreset="last_month"
        />
      </div>

      {monthsQ.data && monthsQ.data.months.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
            title="No reports yet"
            body="No monthly reports have been generated for this client. Get them set up below, then their first P&L will appear here."
          />
          {/* Onboarding tools — reachable before the first report exists. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <EAOpeningBalanceCard schema={schema} />
            <div className="space-y-6">
              <EAQuickBooksImportCard schema={schema} />
              <EAPosImportCard schema={schema} />
            </div>
          </div>
        </div>
      ) : !month ? (
        <Skeleton className="h-[60vh] w-full rounded-2xl" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
          <ReportViewer schema={schema} month={month} />
          <Tabs defaultValue="close" className="min-w-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="close">Close</TabsTrigger>
              <TabsTrigger value="comms">Client</TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>

            {/* Close — the month-end workflow, led by the readiness hub */}
            <TabsContent value="close" className="space-y-6 mt-4">
              <EACloseReadinessCard schema={schema} month={month} />
              <EACategorizationReviewCard schema={schema} month={month} />
              <EASuspenseReviewCard schema={schema} />
              <VerificationCard schema={schema} month={month} qc={qc} />
              <ApprovalCard schema={schema} month={month} qc={qc} />
              <EAMonthNarrativeCard schema={schema} month={month} />
              <FlagsCard schema={schema} month={month} qc={qc} />
              <PendingAdjustmentsCard schema={schema} qc={qc} />
              <NotesCard schema={schema} month={month} qc={qc} />
            </TabsContent>

            {/* Client — comms + receivables */}
            <TabsContent value="comms" className="space-y-6 mt-4">
              <EAMessagesCard schema={schema} />
              <EADocumentsCard schema={schema} />
              <EAReceivablesCard schema={schema} />
            </TabsContent>

            {/* Setup — one-time onboarding tools */}
            <TabsContent value="setup" className="space-y-6 mt-4">
              <EAOpeningBalanceCard schema={schema} />
              <EAPosImportCard schema={schema} />
              <EAQuickBooksImportCard schema={schema} />
              <OverridesCard schema={schema} qc={qc} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Report viewer — inline PDF (P&L / Balance Sheet tabs) + download
// --------------------------------------------------------------------------- //
function ReportViewer({ schema, month }: { schema: string; month: string }) {
  const pnlQ = useQuery({
    queryKey: ["ea", "pnl", schema, month],
    queryFn: () => getClientPnl(schema, month),
    enabled: !!schema && !!month,
    retry: false, // a 404 (no report for this month) shouldn't be retried
  });

  // NOTE: hooks must run before any early return (Rules of Hooks).
  const [qbBusy, setQbBusy] = useState(false);
  async function handleQuickBooks() {
    if (qbBusy) return;
    setQbBusy(true);
    try {
      await downloadQuickBooks(schema, month);
      toast.success("QuickBooks journal CSV downloading");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setQbBusy(false);
    }
  }

  if (pnlQ.isLoading) return <Skeleton className="h-[78vh] w-full rounded-2xl" />;

  if (pnlQ.isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6 text-muted-foreground" />}
        title="Report unavailable"
        body={pnlQ.error instanceof Error ? pnlQ.error.message : "Could not load this report."}
      />
    );
  }

  const links = pnlQ.data!;
  const pnlDownload = asDownloadUrl(links.pnl_pdf_url, `${schema}_${month}_pl.pdf`);

  return (
    <Card className="overflow-hidden min-w-0">
      <Tabs defaultValue="pnl" className="w-full">
        <div className="flex items-center justify-between gap-3 p-3 border-b border-border">
          <TabsList>
            <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleQuickBooks} disabled={qbBusy}
              title="Download the month's P&L as a QuickBooks-importable journal CSV">
              {qbBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              QuickBooks
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={pnlDownload}>
                <Download className="mr-2 h-4 w-4" /> Download P&amp;L
              </a>
            </Button>
          </div>
        </div>

        <TabsContent value="pnl" className="m-0">
          <iframe
            title={`P&L ${month}`}
            src={links.pnl_pdf_url}
            className="w-full h-[78vh] bg-muted"
          />
        </TabsContent>

        <TabsContent value="bs" className="m-0">
          {links.balance_sheet_pdf_url ? (
            <iframe
              title={`Balance Sheet ${month}`}
              src={links.balance_sheet_pdf_url}
              className="w-full h-[78vh] bg-muted"
            />
          ) : (
            <div className="p-8">
              <EmptyState
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="Included in the P&L PDF"
                body="A separate balance-sheet file isn't published for this month — the balance sheet is part of the P&L document on the other tab."
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="worksheet" className="p-4">
          <EAWorksheet schema={schema} month={month} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Pending Adjustments — client correction requests awaiting EA review
// --------------------------------------------------------------------------- //
function PendingAdjustmentsCard({ schema, qc }: { schema: string; qc: ReturnType<typeof useQueryClient> }) {
  const key = ["ea", "pending", schema];
  const pendingQ = useQuery({
    queryKey: key,
    queryFn:  () => getPendingAdjustments(schema),
    enabled:  !!schema,
  });

  const [editAmount, setEditAmount] = useState<Record<string, string>>({});

  const approve = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) => approveAdjustment(id, amount),
    onSuccess: (_, vars) => {
      toast.success("Approved and applied.");
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["ea", "clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Approval failed."),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectAdjustment(id),
    onSuccess: () => {
      toast.success("Request rejected.");
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["ea", "clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Rejection failed."),
  });

  const adjustments = pendingQ.data?.adjustments ?? [];
  if (!pendingQ.isLoading && adjustments.length === 0) return null;

  function fmtAmt(n: number | null | undefined) {
    if (n == null) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  return (
    <Card className="border-accent/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
            {pendingQ.isLoading ? "…" : adjustments.length}
          </span>
          Pending Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingQ.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {adjustments.map((adj) => {
          const isAmountChange = adj.request_type === "amount_change";
          const vendor   = adj.expense?.vendor ?? adj.old_value?.vendor ?? "Unknown";
          const oldAmt   = adj.expense?.amount ?? adj.old_value?.amount;
          const newAmt   = adj.new_value?.amount;
          const pending  = approve.isPending || reject.isPending;
          const editAmt  = editAmount[adj.id] ?? (newAmt != null ? String(newAmt) : "");

          return (
            <div key={adj.id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  <div className="font-medium">{vendor}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isAmountChange
                      ? <>{fmtAmt(oldAmt)} → <span className="text-accent font-medium">{fmtAmt(newAmt)}</span></>
                      : <span className="text-destructive font-medium">Delete request</span>
                    }
                    {" · "}{new Date(adj.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  {adj.client_note && (
                    <div className="text-xs text-muted-foreground mt-1 italic">"{adj.client_note}"</div>
                  )}
                </div>
              </div>

              {/* EA can override the amount before approving */}
              {isAmountChange && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap text-muted-foreground">Final amount:</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editAmt}
                    onChange={(e) => setEditAmount((prev) => ({ ...prev, [adj.id]: e.target.value }))}
                    className="h-7 text-xs"
                    placeholder={newAmt != null ? String(newAmt) : ""}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  disabled={pending}
                  onClick={() => {
                    const finalAmt = isAmountChange
                      ? (editAmt ? parseFloat(editAmt) : newAmt)
                      : undefined;
                    approve.mutate({ id: adj.id, amount: finalAmt ?? undefined });
                  }}
                >
                  {approve.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  disabled={pending}
                  onClick={() => reject.mutate(adj.id)}
                >
                  {reject.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}


// --------------------------------------------------------------------------- //
// Verification — automated monthly close checks
// --------------------------------------------------------------------------- //
function VerificationCard({ schema, month, qc }: SectionProps) {
  const key = ["ea", "verification", schema, month];
  const vQ = useQuery({
    queryKey: key,
    queryFn:  () => getVerificationFlags(schema, month),
    enabled:  !!schema && !!month,
  });

  const resolve = useMutation({
    mutationFn: (flagId: number) => resolveVerificationFlag(schema, flagId),
    onSuccess: () => { toast.success("Flag resolved"); qc.invalidateQueries({ queryKey: key }); },
    onError:   (e) => toast.error(e instanceof Error ? e.message : "Could not resolve flag."),
  });

  const result = vQ.data;

  const statusColor = !result
    ? "border-border"
    : result.error_count > 0
      ? "border-red-300 dark:border-red-800"
      : result.warning_count > 0
        ? "border-amber-300 dark:border-amber-800"
        : "border-green-300 dark:border-green-800";

  const StatusIcon = !result || (result.error_count === 0 && result.warning_count === 0)
    ? ShieldCheck
    : ShieldAlert;

  const iconColor = !result
    ? "text-muted-foreground"
    : result.error_count > 0
      ? "text-red-500"
      : result.warning_count > 0
        ? "text-amber-500"
        : "text-green-500";

  const statusLabel = !result
    ? "Loading…"
    : result.error_count > 0
      ? `${result.error_count} error${result.error_count > 1 ? "s" : ""} — close blocked`
      : result.warning_count > 0
        ? `${result.warning_count} warning${result.warning_count > 1 ? "s" : ""}`
        : "All checks passed";

  const activeFlags = result?.flags.filter((f) => !f.resolved) ?? [];

  return (
    <Card className={statusColor}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${iconColor}`} />
          Verification
          {result && (result.error_count > 0 || result.warning_count > 0) && (
            <span className={`ml-auto text-xs font-normal ${iconColor}`}>{statusLabel}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : !result || activeFlags.length === 0 ? (
          <p className={`text-sm ${result ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {result ? "No open issues for " + monthLabel(month) + "." : "No data."}
          </p>
        ) : (
          <ul className="space-y-2">
            {activeFlags.map((flag) => (
              <VerificationFlagRow
                key={flag.id}
                flag={flag}
                onResolve={() => resolve.mutate(flag.id)}
                busy={resolve.isPending}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  error:   "border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/10",
  warning: "border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10",
  info:    "border-blue-200 bg-blue-50/20 dark:border-blue-900/40 dark:bg-blue-950/10",
};

const SEVERITY_TEXT: Record<string, string> = {
  error:   "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info:    "text-blue-600 dark:text-blue-400",
};

function VerificationFlagRow({
  flag,
  onResolve,
  busy,
}: {
  flag:      VerificationFlag;
  onResolve: () => void;
  busy:      boolean;
}) {
  return (
    <li className={`rounded-xl border p-3 text-sm flex items-start justify-between gap-3 ${SEVERITY_STYLES[flag.severity] ?? ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Badge
            variant="outline"
            className={`text-[10px] capitalize ${SEVERITY_TEXT[flag.severity] ?? ""}`}
          >
            {flag.severity}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">{flag.check_name}</span>
        </div>
        <p className="text-xs">{flag.message}</p>
        {flag.amount !== 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {flag.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 h-7 text-xs"
        disabled={busy}
        onClick={onResolve}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
        Resolve
      </Button>
    </li>
  );
}

// --------------------------------------------------------------------------- //
// Approval — "<Month> Looks Good ✅"
// --------------------------------------------------------------------------- //
function ApprovalCard({ schema, month, qc }: SectionProps) {
  const key = ["ea", "approval", schema, month];
  const approvalQ = useQuery({ queryKey: key, queryFn: () => getApproval(schema, month) });

  const approve = useMutation({
    mutationFn: () => approveMonthViaBackend(schema, month),
    onSuccess: () => { toast.success(`${monthLabel(month)} approved — report email sent`); qc.invalidateQueries({ queryKey: key }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not approve."),
  });
  const undo = useMutation({
    mutationFn: () => unapproveMonth(schema, month),
    onSuccess: () => { toast.success("Approval removed"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not undo."),
  });

  const approved = approvalQ.data;

  return (
    <Card>
      <CardContent className="pt-6">
        {approved ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-medium">{monthLabel(month)} approved</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(approved.approved_at).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => undo.mutate()} disabled={undo.isPending}>
              {undo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={() => approve.mutate()}
            disabled={approve.isPending || approvalQ.isLoading}
          >
            {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {monthLabel(month).split(" ")[0]} Looks Good ✅
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Notes — per client per month
// --------------------------------------------------------------------------- //
function NotesCard({ schema, month, qc }: SectionProps) {
  const key = ["ea", "note", schema, month];
  const noteQ = useQuery({ queryKey: key, queryFn: () => getNote(schema, month) });
  const [draft, setDraft] = useState("");

  // Sync the editor when the stored note loads or the month changes.
  useEffect(() => { setDraft(noteQ.data?.note ?? ""); }, [noteQ.data, month]);

  const save = useMutation({
    mutationFn: () => saveNote(schema, month, draft),
    onSuccess: () => { toast.success("Note saved"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save note."),
  });

  const dirty = draft !== (noteQ.data?.note ?? "");

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={4}
          placeholder={`Notes for ${monthLabel(month)}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Flags — client-flagged line items awaiting EA review
// --------------------------------------------------------------------------- //

function fmtFlagDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFlagAmt(amount: number | null): string {
  if (amount == null) return "";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function FlagRow({
  flag,
  onToggle,
  busy,
}: {
  flag: EAFlagEnriched;
  onToggle: (resolved: boolean) => void;
  busy: boolean;
}) {
  const { expense, resolved, flag_note, line_item_id } = flag;
  const vendor = expense?.vendor ?? line_item_id;

  return (
    <li
      className={`rounded-xl border p-3 text-sm flex items-start justify-between gap-3 ${
        resolved
          ? "border-border bg-transparent opacity-60"
          : "border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/10"
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* Vendor + badge */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <Flag className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className={`font-semibold truncate ${resolved ? "line-through text-muted-foreground" : ""}`}>
            {vendor}
          </span>
          {resolved && <Badge variant="secondary" className="text-[10px] ml-1">resolved</Badge>}
        </div>

        {/* Expense details line */}
        {expense && (
          <div className="text-xs text-muted-foreground mb-1">
            {[
              fmtFlagAmt(expense.amount),
              expense.date ? fmtFlagDate(expense.date) : null,
              expense.pl_category,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}

        {/* Flag note */}
        {flag_note && (
          <p className={`text-xs italic ${resolved ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
            "{flag_note}"
          </p>
        )}
      </div>

      {/* Action button */}
      {resolved ? (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-7 text-xs text-muted-foreground"
          disabled={busy}
          onClick={() => onToggle(false)}
        >
          <Undo2 className="h-3 w-3" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-7 text-xs"
          disabled={busy}
          onClick={() => onToggle(true)}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
          Resolve
        </Button>
      )}
    </li>
  );
}

function FlagsCard({ schema, month, qc }: SectionProps) {
  const key = ["ea", "flags", schema, month];
  const flagsQ = useQuery({
    queryKey: key,
    queryFn: () => getEAFlags(schema, month).then((r) => r.flags),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const toggle = useMutation({
    mutationFn: (v: { id: number; resolved: boolean }) => setFlagResolved(v.id, v.resolved),
    onSuccess: (_, { resolved }) => {
      toast.success(resolved ? "Marked resolved" : "Reopened");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update flag."),
  });

  const flags = flagsQ.data ?? [];
  const unresolvedCount = flags.filter((f) => !f.resolved).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Flags
          {unresolvedCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-bold dark:bg-red-950 dark:text-red-400">
              {unresolvedCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {flagsQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : flags.length > 0 ? (
          <ul className="space-y-2">
            {flags.map((f) => (
              <FlagRow
                key={f.id}
                flag={f}
                onToggle={(resolved) => toggle.mutate({ id: f.id, resolved })}
                busy={toggle.isPending}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No flags for {monthLabel(month)}.</p>
        )}
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Category overrides — re-categorize an expense
// --------------------------------------------------------------------------- //
function OverridesCard({ schema, qc }: { schema: string; qc: ReturnType<typeof useQueryClient> }) {
  const key = ["ea", "overrides", schema];
  const overridesQ = useQuery({ queryKey: key, queryFn: () => getOverrides(schema) });
  const [expenseId, setExpenseId] = useState("");
  const [original, setOriginal] = useState("");
  const [next, setNext] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const add = useMutation({
    mutationFn: () => setOverride(schema, expenseId.trim(), next, original.trim() || undefined),
    onSuccess: () => {
      setExpenseId(""); setOriginal(""); setNext("");
      toast.success("Category overridden"); invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save override."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteOverride(id),
    onSuccess: () => { toast.success("Override removed"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove override."),
  });

  const canAdd = expenseId.trim() && next;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Category overrides</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Expense id"
            value={expenseId}
            onChange={(e) => setExpenseId(e.target.value)}
          />
          <Input
            placeholder="Original category (optional)"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
          />
          <Select value={next} onValueChange={setNext}>
            <SelectTrigger><SelectValue placeholder="New category" /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => add.mutate()} disabled={!canAdd || add.isPending}>
              {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Override category
            </Button>
          </div>
        </div>

        <Separator />

        {overridesQ.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : overridesQ.data && overridesQ.data.length > 0 ? (
          <ul className="space-y-2">
            {overridesQ.data.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-border p-3 text-sm flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{o.expense_id}</div>
                  <p className="text-muted-foreground">
                    {o.original_category ? `${o.original_category} → ` : "→ "}
                    <span className="text-foreground">{o.new_category}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => remove.mutate(o.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No category overrides.</p>
        )}
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Shared bits
// --------------------------------------------------------------------------- //
interface SectionProps {
  schema: string;
  month: string;
  qc: ReturnType<typeof useQueryClient>;
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border bg-card py-16 px-6">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{body}</p>
    </div>
  );
}
