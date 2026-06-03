// EA Portal shell (Component 3) — a sidebar of clients with active/pending
// status dots beside an outlet for the per-client view. Deliberately separate
// from the marketing SiteLayout: its own chrome, no SiteNav/SiteFooter.
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";
import { listClients, type EAClient } from "@/lib/eaApi";
import { useEAAuth } from "@/hooks/useEAAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

  const { data: clients, isLoading, isError, error } = useQuery({
    queryKey: ["ea", "clients"],
    queryFn: listClients,
  });

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
                  <span className="truncate flex-1">{c.business_name}</span>
                  {c.pending_count > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground text-[9px] font-bold shrink-0">
                      {c.pending_count}
                    </span>
                  )}
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
