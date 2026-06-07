// Client Portal — Dashboard (Component 4).
// P&L summary card, bank balance card, top 5 expenses, alerts, morning briefing.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Info, Loader2, RefreshCw,
} from "lucide-react";
import { getDashboard, getMorningBriefing, type DashboardAlert, type MorningBriefing } from "@/lib/clientApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  return new Date().toISOString().slice(0, 7);
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function MorningBriefingCard({ briefing }: { briefing: MorningBriefing }) {
  const stale  = daysSince(briefing.created_at);
  const today  = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const lines  = briefing.content.split("\n").filter((l) => l.trim());

  return (
    <div
      className="rounded-xl bg-amber-50 border border-amber-100 border-l-4 overflow-hidden"
      style={{ borderLeftColor: "#C47A2C" }}
    >
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="font-display font-semibold text-primary text-base">
            ☀️ Good Morning, Mark
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{today}</span>
        </div>
      </div>
      <div className="px-4 py-2 space-y-1.5">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-foreground leading-relaxed">{line}</p>
        ))}
      </div>
      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">Updated daily at 6:45am</span>
        {stale >= 2 && (
          <span className="text-[10px] text-muted-foreground italic">
            Last updated {stale} day{stale !== 1 ? "s" : ""} ago
          </span>
        )}
      </div>
    </div>
  );
}

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

export default function AppDashboard() {
  const [month, setMonth] = useState(currentMonth);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["client", "dashboard", month],
    queryFn:  () => getDashboard(month),
  });

  const { data: morningBriefing } = useQuery({
    queryKey: ["client", "morning-briefing"],
    queryFn:  getMorningBriefing,
    staleTime: 30 * 60 * 1000,
  });

  const pnl  = data?.pnl;
  const net  = pnl ? pnl.net_income : 0;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* ── Month selector ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-primary">
          {month ? monthLabel(month) : "Dashboard"}
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

      {/* ── Morning briefing ───────────────────────────────────── */}
      {morningBriefing && <MorningBriefingCard briefing={morningBriefing} />}

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => <AlertBadge key={i} alert={a} />)}
        </div>
      )}

      {/* ── P&L summary card ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Profit & Loss
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
          ) : pnl ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Revenue</span>
                <span className="font-medium">{fmt(pnl.total_revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Less Sales Tax</span>
                <span className="text-muted-foreground">({fmt(pnl.sales_tax)})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Revenue</span>
                <span className="font-medium">{fmt(pnl.net_revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Expenses</span>
                <span className="font-medium text-destructive">({fmt(pnl.total_expenses)})</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-semibold">Net Income</span>
                <span className={`font-bold text-lg flex items-center gap-1 ${
                  net >= 0 ? "text-primary" : "text-destructive"
                }`}>
                  {net >= 0
                    ? <TrendingUp className="h-4 w-4" />
                    : net < -100
                    ? <TrendingDown className="h-4 w-4" />
                    : <Minus className="h-4 w-4" />
                  }
                  {fmtFull(net)}
                </span>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Bank balances ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Bank Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : data?.cash_balances?.length ? (
            <ul className="space-y-2">
              {data.cash_balances.map((b) => (
                <li key={b.account_name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate pr-2">{b.account_name}</span>
                  <span className={`font-medium tabular-nums shrink-0 ${b.amount < 0 ? "text-destructive" : ""}`}>
                    {fmtFull(b.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No balance data on record.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Top 5 expenses ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : data?.top_expenses?.length ? (
            <ul className="space-y-2.5">
              {data.top_expenses.map((e, i) => (
                <li key={e.id ?? i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.vendor}</div>
                    <div className="text-xs text-muted-foreground truncate">{e.category}</div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">{fmtFull(e.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No expense data this month.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Morning briefing ───────────────────────────────────── */}
      {(isLoading || data?.briefing) && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-accent">
              {data?.briefing?.title ?? "Monthly Briefing"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            ) : data?.briefing ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {data.briefing.body}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
