// Client Portal — Tax Center (Component 4).
// Upcoming CDTFA deadlines, monthly sales tax history.
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, AlertTriangle, CheckCircle2, PiggyBank } from "lucide-react";
import { getTax } from "@/lib/clientApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function AppTax() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "tax"],
    queryFn:  getTax,
  });

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-display text-xl font-semibold text-primary">Tax Center</h1>

      {isError && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      )}

      {/* ── Most recent payable ────────────────────────────────── */}
      {(isLoading || data?.most_recent_payable) && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="pt-4 pb-4">
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : data?.most_recent_payable ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-accent font-medium mb-0.5">
                    CDTFA — Sales Tax Collected
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {monthLabel(data.most_recent_payable.month)}
                  </div>
                </div>
                <div className="text-xl font-bold text-accent">
                  {fmt(data.most_recent_payable.amount)}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* ── Income-tax set-aside recommendation ────────────────── */}
      {data?.income_tax_setaside && data.income_tax_setaside.recommended_monthly > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4" /> Suggested Tax Set-Aside
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {fmt(data.income_tax_setaside.recommended_monthly)}
                  <span className="text-sm font-normal text-muted-foreground"> /mo</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Set aside about{" "}
                  <span className="font-medium">{fmt(data.income_tax_setaside.set_aside_by_deadline)}</span>{" "}
                  before {new Date(data.income_tax_setaside.next_deadline + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {data.income_tax_setaside.planning_rate} rate
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {data.income_tax_setaside.disclaimer}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Upcoming deadlines ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" /> Upcoming CDTFA Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : data?.upcoming_deadlines?.length ? (
            <ul className="space-y-2">
              {data.upcoming_deadlines.map((d) => {
                const urgent = d.days_until <= 14;
                const soon   = d.days_until <= 30;
                return (
                  <li
                    key={d.quarter}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                      urgent ? "bg-destructive/8" : soon ? "bg-accent/8" : "bg-secondary"
                    }`}
                  >
                    {urgent
                      ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      : soon
                      ? <AlertTriangle className="h-4 w-4 text-accent shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {d.quarter} — Quarterly Return
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Due {new Date(d.due_date + "T12:00:00").toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${
                        urgent ? "border-destructive/40 text-destructive"
                               : soon ? "border-accent/40 text-accent" : ""
                      }`}
                    >
                      {d.days_until === 0 ? "Today" : `${d.days_until}d`}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Monthly tax history ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sales Tax History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : data?.monthly_history?.length ? (
            <ul className="space-y-2">
              {data.monthly_history.map((r) => (
                <li key={r.month} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{monthLabel(r.month)}</span>
                  <span className="font-medium tabular-nums">{fmt(r.tax_collected)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No tax history on record.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-2">
        CA CDTFA quarterly returns are due the last day of the month following each quarter close.
        Contact your tax consultant for filing assistance.
      </p>
    </div>
  );
}
