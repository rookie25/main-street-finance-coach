// Client Portal shell (Component 4) — mobile-first layout for Mark (iPhone).
// Header at top, scrollable content in the middle, bottom navigation tab bar.
// Deliberately separate from SiteLayout and EALayout.
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Receipt, FileBarChart2, Calculator, MessageSquare, LogOut,
} from "lucide-react";
import { useClientAuth } from "@/hooks/useClientAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/app",          label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/expenses", label: "Expenses",  icon: Receipt          },
  { to: "/app/reports",  label: "Reports",   icon: FileBarChart2    },
  { to: "/app/tax",      label: "Tax",       icon: Calculator       },
  { to: "/app/chat",     label: "Ask AI",    icon: MessageSquare    },
] as const;

export default function ClientLayout() {
  const { user, signOut } = useClientAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/app/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-accent leading-none">
            Desired Labs
          </div>
          <div className="font-display text-base font-semibold text-primary leading-tight">
            Groundstack Coffee
          </div>
        </div>
        <button
          onClick={handleSignOut}
          title={`Sign out (${user?.email})`}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* ── Scrollable main content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* ── Bottom navigation tab bar ───────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border">
        <ul className="flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-2.5 w-full text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
