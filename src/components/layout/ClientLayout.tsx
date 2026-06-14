// Client Portal shell (Component 4) — mobile-first layout for Mark (iPhone).
// Header at top, scrollable content in the middle, bottom navigation tab bar.
// Deliberately separate from SiteLayout and EALayout.
import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Receipt, Camera, FileBarChart2, Calculator, MessageCircle, MessageSquare, FileText, CreditCard, LogOut, Bell,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/lib/supabase";
import { safeChannel, safeRemoveChannel } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { getNotifications, getMe, markNotificationsRead, getBillingStatus } from "@/lib/clientApi";
import NotificationsPanel from "@/components/client/NotificationsPanel";

type NavItem = {
  to: string; label: string; icon: typeof LayoutDashboard;
  end?: boolean; badge?: boolean;
};

const BASE_NAV: NavItem[] = [
  { to: "/app",           label: "Dashboard", icon: LayoutDashboard, end: true,  badge: false },
  { to: "/app/receipts",  label: "Receipts",  icon: Camera,                       badge: false },
  { to: "/app/expenses",  label: "Expenses",  icon: Receipt,                      badge: false },
  { to: "/app/reports",   label: "Reports",   icon: FileBarChart2,               badge: false },
  { to: "/app/tax",       label: "Tax",       icon: Calculator,                  badge: false },
  { to: "/app/cpa",       label: "CPA",       icon: MessageCircle,               badge: true  },
  { to: "/app/chat",      label: "Ask AI",    icon: MessageSquare,               badge: false },
];

const INVOICES_ITEM: NavItem = { to: "/app/invoices", label: "Invoices", icon: FileText, badge: false };
const BILLING_ITEM: NavItem  = { to: "/app/billing",  label: "Billing",  icon: CreditCard, badge: false };

// Invoicing is central for service & construction businesses but irrelevant to
// POS / food / retail (they take payment at the point of sale). Show the tab
// only where it earns its place; hide it everywhere else to keep the bar lean.
function showsInvoices(businessType: string | null | undefined): boolean {
  const t = (businessType ?? "").toLowerCase();
  const noInvoice = /coffee|cafe|café|restaurant|food|bakery|bar|retail|shop|store|grocer|boutique|ecommerce|e-commerce|salon|spa/;
  if (noInvoice.test(t)) return false;
  return true; // construction, services, consulting, trades, and unknown all invoice
}

// Billing only appears once a plan is configured for the client, so existing
// clients don't see an empty "contact us" tab until billing is actually set up.
function buildNav(businessType: string | null | undefined, hasBilling: boolean): NavItem[] {
  const items = [...BASE_NAV];
  if (showsInvoices(businessType)) {
    // Insert Invoices right after Reports so AR sits next to financials.
    const at = items.findIndex((i) => i.to === "/app/reports") + 1;
    items.splice(at, 0, INVOICES_ITEM);
  }
  if (hasBilling) {
    const at = items.findIndex((i) => i.to === "/app/tax") + 1;
    items.splice(at, 0, BILLING_ITEM);
  }
  return items;
}

export default function ClientLayout() {
  const { user, signOut } = useClientAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: notificationsData } = useQuery({
    queryKey: ["client", "notifications"],
    queryFn:  getNotifications,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: meData } = useQuery({
    queryKey: ["client", "me"],
    queryFn:  getMe,
    staleTime: 10 * 60 * 1000,
  });
  const { data: billingData } = useQuery({
    queryKey: ["client", "billing"],
    queryFn:  getBillingStatus,
    staleTime: 10 * 60 * 1000,
  });
  const unreadNotifications = notificationsData?.unread_count ?? 0;
  const notificationsList   = notificationsData?.notifications ?? [];
  const navItems            = buildNav(meData?.business_type, Boolean(billingData?.has_plan));

  useEffect(() => {
    let mounted = true;
    async function fetchUnread() {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_role", "ea")
        .is("read_at", null);
      if (mounted) setUnreadMessages(count ?? 0);
    }
    fetchUnread();

    const channel = safeChannel(() =>
      supabase
        .channel("client-messages-unread")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          fetchUnread();
        })
        .subscribe(),
    );

    return () => {
      mounted = false;
      safeRemoveChannel(channel);
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/app/login", { replace: true });
  }

  return (
    <div className="app-theme min-h-screen bg-background flex flex-col">
      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between bg-card border-b border-border">
        <Link to="/app" className="block -m-1 p-1 rounded-lg" aria-label="Go to dashboard">
          <div className="text-[10px] uppercase tracking-[0.18em] leading-none font-semibold">
            <span className="text-foreground">Desired</span>{" "}
            <span className="text-accent">Labs</span>
          </div>
          <div className="text-base font-semibold leading-tight text-foreground mt-0.5">
            {meData?.business_name ?? "Your Business"}
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const isOpening = !panelOpen;
              setPanelOpen(isOpening);
              if (isOpening) void markNotificationsRead();
            }}
            title="Notifications"
            className="relative p-2 rounded-xl bg-secondary border border-border hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4 text-foreground" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1 border-2 border-card">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
          <button
            onClick={handleSignOut}
            title={`Sign out (${user?.email})`}
            className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {panelOpen && (
        <NotificationsPanel
          notifications={notificationsList}
          onClose={() => setPanelOpen(false)}
          onAnswered={() => {
            qc.invalidateQueries({ queryKey: ["client", "notifications"] });
          }}
        />
      )}

      {/* ── Scrollable main content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* ── Bottom navigation tab bar ───────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20" style={{ background: "#ffffff", borderTop: "1px solid #E2E8F0" }}>
        <ul className="flex">
          {navItems.map(({ to, label, icon: Icon, end, badge }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-2.5 w-full text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-[#6366F1]"
                      : "text-[#94A3B8] hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                      {badge && unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-accent-foreground">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </span>
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
