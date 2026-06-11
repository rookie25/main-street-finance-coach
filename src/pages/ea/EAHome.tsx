// EA Portal landing (/ea) — portfolio dashboard: every assigned client's status,
// net income, alerts, and pending review items at a glance.
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Clock, ChevronRight } from "lucide-react";
import { listClients, getClientsSummary, getClientsAlerts } from "@/lib/eaApi";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(n: number | null | undefined): string {
  return n == null
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return "no sync yet";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "synced today" : days === 1 ? "synced 1d ago" : `synced ${days}d ago`;
}

function StatCard({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function EAHome() {
  const { data: clients, isLoading } = useQuery({ queryKey: ["ea", "clients"], queryFn: listClients });
  const { data: summary } = useQuery({ queryKey: ["ea", "clients", "summary"], queryFn: getClientsSummary });
  const { data: alerts }  = useQuery({ queryKey: ["ea", "clients", "alerts"],  queryFn: getClientsAlerts });

  const sumBySchema = Object.fromEntries((summary ?? []).map((s) => [s.schema_name, s]));
  const alBySchema  = Object.fromEntries((alerts ?? []).map((a) => [a.schema_name, a.alerts]));

  const list = clients ?? [];
  const totalPending  = list.reduce((n, c) => n + (c.pending_count || 0), 0);
  const needAttention = list.filter(
    (c) => (c.pending_count || 0) > 0 || (alBySchema[c.client_schema] ?? []).some((a) => a.color === "red"),
  ).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-primary">Your Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Portfolio overview — select a client to review, flag, and approve the month.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Clients" value={isLoading ? "—" : list.length} />
        <StatCard label="Pending items" value={totalPending} accent={totalPending > 0} />
        <StatCard label="Need attention" value={needAttention} accent={needAttention > 0} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-[68px] w-full rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No clients assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const s  = sumBySchema[c.client_schema];
            const al = alBySchema[c.client_schema] ?? [];
            return (
              <Link
                key={c.client_schema}
                to={`/ea/clients/${c.client_schema}`}
                className="block rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{c.business_name}</span>
                      {c.status === "pending" && (
                        <span className="text-[10px] uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Onboarding
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {relTime(s?.last_sync)}
                      </span>
                      {al.map((a, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded ${
                            a.color === "red"
                              ? "bg-red-50 text-red-600"
                              : a.color === "amber"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-green-50 text-green-600"
                          }`}
                        >
                          {a.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums flex items-center gap-1 justify-end">
                      {s?.net_income != null &&
                        (s.net_income >= 0
                          ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-600" />)}
                      {fmt(s?.net_income)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      net income · {fmt(s?.net_revenue)} rev
                    </div>
                  </div>

                  {c.pending_count > 0 && (
                    <span className="shrink-0 text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {c.pending_count}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
