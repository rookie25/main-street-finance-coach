// Client Portal — Dashboard (Component 4).
// Two-column layout: left = briefing + P&L, right = stat hero cards.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Info, RefreshCw, Sun, FileText, ChevronRight,
} from "lucide-react";
import { getDashboard, getMorningBriefing, getMe, getConnectionHealth, type DashboardAlert, type MorningBriefing } from "@/lib/clientApi";
import { Skeleton } from "@/components/ui/skeleton";

// ── formatters (unchanged) ────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtFull(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function currentMonth() {
  // Use PT-aware date so the default month stays correct up until midnight in Pacific time.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }).slice(0, 7);
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Briefing card ─────────────────────────────────────────────────────────────

function MorningBriefingCard({ briefing, name }: { briefing: MorningBriefing; name?: string }) {
  const stale = daysSince(briefing.created_at);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles",
  });
  const lines = briefing.content.split("\n").filter((l) => l.trim());
  // Last line = actionable tip → indigo
  const tipLine  = lines.length > 1 ? lines[lines.length - 1] : null;
  const bodyLines = tipLine ? lines.slice(0, -1) : lines;

  return (
    <div
      className="bg-white overflow-hidden"
      style={{ border: "1px solid #E2E8F0", borderLeft: "3px solid #5B5BD6", borderRadius: "0 12px 12px 0" }}
    >
      {/* Header row */}
      <div className="px-4 pt-4 pb-2 flex items-start gap-3">
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(91,91,214,0.1)" }}
        >
          <Sun className="h-4 w-4" style={{ color: "#5B5BD6" }} />
        </div>
        <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2 flex-wrap">
          <span className="font-bold text-sm" style={{ color: "#14161C" }}>
            Good morning{name ? `, ${name}` : ""}
          </span>
          <span className="text-xs shrink-0" style={{ color: "#94A3B8" }}>{today}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-2 space-y-1.5">
        {bodyLines.map((line, i) => {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className="text-sm" style={{ color: "#64748B", lineHeight: 1.65 }}>
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j} style={{ color: "#14161C" }}>{part}</strong> : part
              )}
            </p>
          );
        })}
      </div>

      {/* Tip line */}
      {tipLine && (
        <div className="px-4 py-2.5" style={{ borderTop: "1px solid #F1F5F9" }}>
          <p className="text-xs font-semibold" style={{ color: "#5B5BD6" }}>
            {tipLine.replace(/\*\*(.*?)\*\*/g, "$1")}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        <span style={{ fontSize: 10, color: "#94A3B8" }}>Updated daily at 6:45am</span>
        {stale >= 2 && (
          <span style={{ fontSize: 10, color: "#94A3B8", fontStyle: "italic" }}>
            Last updated {stale} day{stale !== 1 ? "s" : ""} ago
          </span>
        )}
      </div>
    </div>
  );
}

// ── Alert badge (unchanged) ───────────────────────────────────────────────────

function AlertBadge({ alert }: { alert: DashboardAlert }) {
  const isWarn = alert.severity === "warning";
  return (
    <div className={`flex items-start gap-2.5 rounded-xl p-3 text-sm ${
      isWarn ? "bg-destructive/8 text-destructive" : "bg-accent/8 text-accent"
    }`}>
      {isWarn
        ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        : <Info className="h-4 w-4 mt-0.5 shrink-0" />
      }
      <span>{alert.message}</span>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function AppDashboard() {
  const [month, setMonth] = useState(currentMonth);

  // ── data fetching (unchanged) ─────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey:             ["client", "dashboard", month],
    queryFn:              () => getDashboard(month),
    staleTime:            60_000,
    refetchOnWindowFocus: false,
  });

  const { data: morningBriefing } = useQuery({
    queryKey: ["client", "morning-briefing"],
    queryFn:  getMorningBriefing,
    staleTime: 30 * 60 * 1000,
  });

  const { data: meData } = useQuery({
    queryKey: ["client", "me"],
    queryFn:  getMe,
    staleTime: 10 * 60 * 1000,
  });

  const { data: connHealth } = useQuery({
    queryKey: ["client", "connection-health"],
    queryFn:  getConnectionHealth,
    staleTime: 5 * 60 * 1000,
  });

  const firstName = meData?.full_name?.split(" ")[0];
  const pnl       = data?.pnl;
  const net       = pnl ? pnl.net_income : 0;
  const totalCash = data?.cash_balance ?? null;
  const lowCash   = totalCash !== null && totalCash < 2000;
  // Tax due — future field; card is hidden until data exists
  const taxDue    = data?.tax_due;
  // Accounts receivable — only shown once the business has open invoices
  const ar        = data?.accounts_receivable;
  const showAR    = !!ar && ar.open_count > 0;

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Sticky topbar ──────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: "#fff", borderBottom: "1px solid #E2E8F0" }}
      >
        <h1 className="font-display" style={{ fontWeight: 700, color: "#14161C", fontSize: 18 }}>
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <div className="p-4 space-y-3 flex-1">

        {/* ── Data-source health pill ──────────────────────────────────── */}
        {connHealth && connHealth.overall !== "unknown" && (() => {
          const ov = connHealth.overall;
          const dot = ov === "healthy" ? "#16A34A" : ov === "stale" ? "#D97706" : "#DC2626";
          const label = ov === "healthy"
            ? "Data sources up to date"
            : ov === "stale"
            ? "Catching up on recent data"
            : "A data source needs attention";
          const detail = connHealth.connections
            .map((c) => c.source)
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              className="flex items-center gap-2 text-[11px] text-muted-foreground px-3 py-1.5 rounded-lg"
              style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              title={connHealth.connections.map((c) => `${c.source}: ${c.message}`).join("\n")}
            >
              <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />
              <span className="font-medium" style={{ color: "#475569" }}>{label}</span>
              {detail && <span className="truncate">— {detail}</span>}
            </div>
          );
        })()}

        {/* Alerts — full width above grid */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((a, i) => <AlertBadge key={a.type ?? i} alert={a} />)}
          </div>
        )}

        {/* ── Two-column grid ──────────────────────────────────────────── */}
        <div
          className="flex flex-col md:grid gap-3"
          style={{ gridTemplateColumns: "1.4fr 1fr" }}
        >
          {/* ── LEFT column — briefing + P&L ─────────── */}
          {/* order-2 on mobile so right column (stats) appears first */}
          <div className="order-2 md:order-1 flex flex-col gap-3">

            {/* Briefing card */}
            {morningBriefing && (
              <MorningBriefingCard briefing={morningBriefing} name={firstName} />
            )}

            {/* P&L summary card */}
            <div className="bg-white" style={{ border: "1px solid #E2E8F0", borderRadius: 12 }}>
              {/* Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
                <span className="font-bold text-sm" style={{ color: "#14161C" }}>
                  P&L Summary — {monthLabel(month)}
                </span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: "rgba(251,191,36,0.12)",
                    color: "#B45309",
                    border: "1px solid rgba(251,191,36,0.35)",
                  }}
                >
                  Pending
                </span>
              </div>

              {/* Line items */}
              <div className="px-4 pb-4 space-y-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                  </div>
                ) : isError ? (
                  <p className="text-sm text-destructive">
                    {error instanceof Error ? error.message : "Failed to load"}
                  </p>
                ) : pnl ? (
                  <>
                    <PnlRow label="Gross Revenue"   value={fmt(pnl.total_revenue)}  bold />
                    <PnlRow label="Less Sales Tax"  value={`(${fmt(pnl.sales_tax)})`} muted />
                    <PnlRow label="Net Revenue"     value={fmt(pnl.net_revenue)}    bold />
                    <PnlRow label="Total Expenses"  value={`(${fmt(pnl.total_expenses)})`} red />
                    <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 10, marginTop: 4 }}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm" style={{ color: "#14161C" }}>Net Income</span>
                        <span
                          className="font-bold flex items-center gap-1"
                          style={{ fontSize: 18, color: net >= 0 ? "#16A34A" : "#DC2626" }}
                        >
                          {net >= 0
                            ? <TrendingUp className="h-4 w-4" />
                            : net < -100
                            ? <TrendingDown className="h-4 w-4" />
                            : <Minus className="h-4 w-4" />
                          }
                          {fmtFull(net)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No P&L data this month.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT column — stat hero cards ───────── */}
          <div className="order-1 md:order-2 flex flex-col gap-2.5">

            {/* 1 — Net income hero */}
            <div style={{ background: "#14161C", borderRadius: 12, padding: 14 }}>
              <div
                style={{
                  fontSize: 9, color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
                }}
              >
                Net income · {monthLabel(month)}
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" style={{ background: "rgba(255,255,255,0.08)" }} />
              ) : (
                <div
                  style={{
                    fontSize: 28, fontWeight: 800, color: "#fff",
                    letterSpacing: "-1px", lineHeight: 1,
                    color: net >= 0 ? "#fff" : "#FCA5A5",
                  }}
                >
                  {fmtFull(net)}
                </div>
              )}
            </div>

            {/* 2 — Net revenue */}
            <div className="bg-white" style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
              <StatLabel>Net Revenue</StatLabel>
              {isLoading ? (
                <Skeleton className="h-6 w-28 mt-1" />
              ) : (
                <div style={{ fontSize: 22, fontWeight: 700, color: "#14161C", marginTop: 2 }}>
                  {pnl ? fmt(pnl.net_revenue) : "—"}
                </div>
              )}
            </div>

            {/* 3 — Cash balance */}
            <div
              style={{
                background: lowCash ? "#FEF2F2" : "#fff",
                border: `1px solid ${lowCash ? "#FECACA" : "#E2E8F0"}`,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <StatLabel color={lowCash ? "#DC2626" : undefined}>Cash Balance</StatLabel>
              {isLoading ? (
                <Skeleton className="h-6 w-28 mt-1" />
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 22, fontWeight: 700, marginTop: 2,
                      color: lowCash ? "#DC2626" : "#14161C",
                    }}
                  >
                    {totalCash !== null ? fmtFull(totalCash) : "—"}
                  </div>
                  {lowCash && (
                    <div style={{ fontSize: 11, color: "#DC2626", marginTop: 3, fontWeight: 600 }}>
                      Transfer today
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 4 — Accounts receivable (hidden until there are open invoices) */}
            {showAR && ar && (
              <Link
                to="/app/invoices"
                style={{
                  background: ar.overdue > 0 ? "#FEF2F2" : "#fff",
                  border: `1px solid ${ar.overdue > 0 ? "#FECACA" : "#E2E8F0"}`,
                  borderRadius: 12,
                  padding: 14,
                  display: "block",
                }}
              >
                <div className="flex items-center justify-between">
                  <StatLabel color={ar.overdue > 0 ? "#DC2626" : undefined}>You're Owed</StatLabel>
                  <ChevronRight className="h-4 w-4" style={{ color: "#94A3B8" }} />
                </div>
                <div
                  style={{
                    fontSize: 22, fontWeight: 700, marginTop: 2,
                    color: ar.overdue > 0 ? "#DC2626" : "#14161C",
                  }}
                >
                  {fmtFull(ar.outstanding)}
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  <FileText className="h-3 w-3" />
                  {ar.open_count} open invoice{ar.open_count === 1 ? "" : "s"}
                  {ar.overdue > 0 && (
                    <span style={{ color: "#DC2626", fontWeight: 600 }}>
                      · {fmt(ar.overdue)} overdue
                    </span>
                  )}
                </div>
              </Link>
            )}

            {/* 5 — Tax due (hidden if no data) */}
            {taxDue && (
              <div
                style={{
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <StatLabel color="#B45309">Tax Due</StatLabel>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#B45309", marginTop: 2 }}>
                  {new Date(taxDue.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div style={{ fontSize: 11, color: "#B45309", marginTop: 3 }}>
                  {Math.ceil((new Date(taxDue.date).getTime() - Date.now()) / 86400000)} days away
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function PnlRow({
  label, value, bold, muted, red,
}: {
  label: string; value: string; bold?: boolean; muted?: boolean; red?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span style={{ color: "#64748B" }}>{label}</span>
      <span
        style={{
          color: red ? "#DC2626" : muted ? "#94A3B8" : "#14161C",
          fontWeight: bold || red ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em",
        color: color ?? "#94A3B8", fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}
