// EA Portal shell (Component 3) — a sidebar of clients with active/pending
// status dots beside an outlet for the per-client view. Deliberately separate
// from the marketing SiteLayout: its own chrome, no SiteNav/SiteFooter.
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Loader2, AlertTriangle, MessageCircle, UserCircle } from "lucide-react";
import { listClients, getClientsSummary, getClientsAlerts, type EAClient, type ClientSummary, type ClientAlertsData } from "@/lib/eaApi";
import { useEAAuth } from "@/hooks/useEAAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function fmtMoney(n: number | null): string {
  if (n === null) return "";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function fmtSyncDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusDot({ status }: { status: EAClient["status"] }) {
  // active → brand green; pending → gold. Title gives the raw label on hover.
  return (
    <span
      title={status}
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        status === "active" ? "bg-primary" : "bg-accent",
      )}
    />
  );
}

export default function EALayout() {
  const { user, signOut } = useEAAuth();
  const navigate = useNavigate();
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});

  const { data: clients, isLoading, isError, error } = useQuery({
    queryKey: ["ea", "clients"],
    queryFn: listClients,
  });

  const { data: summaries } = useQuery({
    queryKey: ["ea", "clients-summary"],
    queryFn: getClientsSummary,
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientsAlerts } = useQuery({
    queryKey: ["ea", "clients-alerts"],
    queryFn: getClientsAlerts,
    staleTime: 5 * 60 * 1000,
  });

  const summaryMap = useMemo(() => {
    const map: Record<string, ClientSummary> = {};
    for (const s of summaries ?? []) map[s.schema_name] = s;
    return map;
  }, [summaries]);

  const alertsMap = useMemo(() => {
    const map: Record<string, ClientAlertsData["alerts"]> = {};
    for (const a of clientsAlerts ?? []) map[a.schema_name] = a.alerts;
    return map;
  }, [clientsAlerts]);

  useEffect(() => {
    let mounted = true;
    async function fetchUnread() {
      const { data } = await supabase
        .from("messages")
        .select("client_schema")
        .eq("sender_role", "client")
        .is("read_at", null);
      if (!mounted || !data) return;
      const counts: Record<string, number> = {};
      for (const row of data) {
        const s = row.client_schema as string;
        counts[s] = (counts[s] ?? 0) + 1;
      }
      setMsgCounts(counts);
    }
    fetchUnread();

    const channel = supabase
      .channel("ea-messages-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/ea/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent">Desired Labs</div>
          <div className="font-display text-lg font-semibold text-primary">EA Portal</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Clients
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {isError && (
            <div className="flex items-start gap-2 px-2 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error instanceof Error ? error.message : "Couldn't load clients."}</span>
            </div>
          )}

          {clients?.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">No clients yet.</div>
          )}

          <ul className="space-y-1">
            {clients?.map((c) => (
              <li key={c.client_schema}>
                <NavLink
                  to={`/ea/clients/${encodeURIComponent(c.client_schema)}`}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary",
                    )
                  }
                >
                  <StatusDot status={c.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate flex-1">{c.business_name}</span>
                      {msgCounts[c.client_schema] > 0 && (
                        <span className="flex items-center gap-0.5 shrink-0 text-[9px] font-bold text-primary/70">
                          <MessageCircle className="h-3 w-3" />
                          {msgCounts[c.client_schema]}
                        </span>
                      )}
                      {c.pending_count > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground text-[9px] font-bold shrink-0">
                          {c.pending_count}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const s = summaryMap[c.client_schema];
                      if (!s || (s.net_revenue === null && s.net_income === null && !s.last_sync)) return null;
                      return (
                        <div className="mt-0.5 text-xs text-muted-foreground leading-snug">
                          {(s.net_revenue !== null || s.net_income !== null) && (
                            <span>
                              {s.net_revenue !== null && `Revenue: ${fmtMoney(s.net_revenue)}`}
                              {s.net_revenue !== null && s.net_income !== null && "  "}
                              {s.net_income !== null && `NI: ${fmtMoney(s.net_income)}`}
                            </span>
                          )}
                          {s.last_sync && (
                            <span className="block">Synced: {fmtSyncDate(s.last_sync)}</span>
                          )}
                        </div>
                      );
                    })()}
                    {(() => {
                      const pills = alertsMap[c.client_schema];
                      if (!pills?.length) return null;
                      return (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {pills.map((alert) => (
                            <span
                              key={alert.type}
                              className={cn(
                                "inline-flex rounded-full text-[10px] font-medium px-1.5 py-0.5",
                                alert.color === "green" && "bg-green-100 text-green-700",
                                alert.color === "amber" && "bg-amber-100 text-amber-700",
                                alert.color === "red"   && "bg-red-100 text-red-700",
                              )}
                            >
                              {alert.type === "report"
                                ? `📄 ${alert.label}`
                                : alert.color === "red"
                                  ? `🔴 ${alert.label}`
                                  : `⚠️ ${alert.label}`}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer: who's signed in + sign out */}
        <div className="border-t border-border p-3">
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
          <NavLink
            to="/ea/profile"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors mb-1",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-secondary",
              )
            }
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            Profile
          </NavLink>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
