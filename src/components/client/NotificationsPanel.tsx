import { useState } from "react";
import { X, AlertTriangle, CheckCircle, FileText, CreditCard, Wallet, ShoppingBasket, Wrench, Building2, Users, User, MoreHorizontal, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClientNotification } from "@/lib/clientApi";
import { answerUnknownCharge } from "@/lib/clientApi";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  notifications: ClientNotification[];
  onClose: () => void;
  onAnswered?: () => void;
}

const BORDER_COLOR: Record<string, string> = {
  urgent:  "border-l-[#DC2626]",
  warning: "border-l-[#C47A2C]",
  info:    "border-l-[#1A5C38]",
};

const ICON_COLOR: Record<string, string> = {
  urgent:  "text-[#DC2626]",
  warning: "text-[#C47A2C]",
  info:    "text-[#1A5C38]",
};

function getIcon(type: string) {
  if (type === "report_ready")  return FileText;
  if (type === "amex_past_due") return CreditCard;
  if (type === "low_balance")   return Wallet;
  return AlertTriangle;
}

// ── Quick category tiles ──────────────────────────────────────────────────────

interface QuickCategory {
  label:      string;
  Icon:       React.ElementType;
  color:      string;
  category:   string | null;
  plCategory: string | null;
  isPersonal: boolean;
  opensSearch?: boolean;
}

const QUICK_CATEGORIES: QuickCategory[] = [
  { label: "Food & Supplies", Icon: ShoppingBasket, color: "#C47A2C", category: "Cost of Goods Sold",    plCategory: "Cost of Goods Sold",    isPersonal: false },
  { label: "Repairs",         Icon: Wrench,         color: "#6366F1", category: "Repairs & Maintenance", plCategory: "Repairs & Maintenance", isPersonal: false },
  { label: "Rent & Utils",    Icon: Building2,      color: "#0891B2", category: "Rent & Lease",           plCategory: "Rent & Lease",          isPersonal: false },
  { label: "Payroll",         Icon: Users,          color: "#16A34A", category: "Payroll",                plCategory: "Payroll",               isPersonal: false },
  { label: "Personal",        Icon: User,           color: "#94A3B8", category: "owners_draw",            plCategory: "Owners Draw",           isPersonal: true  },
  { label: "Other…",          Icon: MoreHorizontal, color: "#64748B", category: null,                    plCategory: null,                    isPersonal: false, opensSearch: true },
];

// Map backend suggestion slugs → quick tile label
const SUGGESTION_TILE: Record<string, string> = {
  payroll:   "Payroll",
  cogs:      "Food & Supplies",
  repairs:   "Repairs",
  utilities: "Rent & Utils",
};

function tileForSuggestion(slug: string | null | undefined): QuickCategory | null {
  if (!slug) return null;
  const label = SUGGESTION_TILE[slug];
  return label ? (QUICK_CATEGORIES.find((t) => t.label === label) ?? null) : null;
}

const FULL_CATEGORIES = [
  "Cost of Goods Sold", "Repairs & Maintenance", "Rent & Lease", "Utilities",
  "Payroll", "Payroll Taxes", "Insurance", "Advertising & Marketing",
  "Bank Charges & Fees", "Dues & Subscriptions", "Supplies", "Meals & Entertainment",
  "Legal & Professional", "Depreciation", "Interest Paid", "Owners Draw", "Other",
];

// ── Unknown Charge Card ───────────────────────────────────────────────────────

function UnknownChargeCard({ notification, onAnswered }: {
  notification: ClientNotification;
  onAnswered:   () => void;
}) {
  const meta       = notification.meta as Record<string, unknown>;
  const chargeId   = meta.charge_id          as string;
  const vendor     = meta.vendor             as string;
  const amount     = meta.amount             as number;
  const dateStr    = meta.date               as string;
  const suggSlug   = meta.suggested_category as string | null | undefined;

  const suggestedTile = tileForSuggestion(suggSlug);

  const [selected,    setSelected]    = useState<QuickCategory | null>(suggestedTile);
  const [fullCat,     setFullCat]     = useState<string | null>(null);
  const [showSearch,  setShowSearch]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [saving,      setSaving]      = useState(false);
  // True while the user hasn't deviated from the pre-selected suggestion
  const [usingHint,   setUsingHint]   = useState(!!suggestedTile);
  const qc = useQueryClient();

  const filteredFull = FULL_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  // The effective selection: either a quick tile or a category from the full list
  const effectiveCategory = fullCat
    ? { label: fullCat, category: fullCat, plCategory: fullCat, isPersonal: false }
    : selected;

  async function handleSave() {
    if (!effectiveCategory || !chargeId) return;
    setSaving(true);
    try {
      await answerUnknownCharge(
        chargeId,
        effectiveCategory.category,
        effectiveCategory.plCategory,
        effectiveCategory.isPersonal,
      );
      qc.invalidateQueries({ queryKey: ["client", "notifications"] });
      toast.success(`Got it — ${vendor} will always be ${effectiveCategory.label}`);
      onAnswered();
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function selectQuick(tile: QuickCategory) {
    setUsingHint(tile === suggestedTile && !tile.opensSearch);
    if (tile.opensSearch) {
      setShowSearch(true);
      setSelected(tile);
      setFullCat(null);
    } else {
      setSelected(tile);
      setShowSearch(false);
      setFullCat(null);
    }
  }

  function selectFull(cat: string) {
    setFullCat(cat);
    setSelected(null);
    setUsingHint(false);
  }

  return (
    <div style={{ borderLeft: "4px solid #C47A2C" }} className="pl-3 pr-4 py-3.5 bg-amber-50/40">
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#C47A2C]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            Unknown charge — ${(amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{vendor} · {dateStr}</p>
          <p className="text-xs font-medium text-[#C47A2C] mt-1.5">What's this charge for?</p>
        </div>
      </div>

      {/* Suggestion hint badge */}
      {suggestedTile && usingHint && (
        <p className="text-[10px] text-indigo-600 font-medium mb-2 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Suggested based on vendor name — tap a different tile to override
        </p>
      )}

      {/* 3×2 quick tile grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">

        {QUICK_CATEGORIES.map((tile) => {
          const isActive = !tile.opensSearch
            ? selected?.label === tile.label && !fullCat
            : showSearch && !fullCat;
          return (
            <button
              key={tile.label}
              onClick={() => selectQuick(tile)}
              className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-all"
              style={{
                border:     isActive ? `1.5px solid #6366F1` : "1.5px solid #E2E8F0",
                background: isActive ? "#EEF2FF" : "#fff",
              }}
            >
              <tile.Icon style={{ color: isActive ? "#6366F1" : tile.color }} className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-tight" style={{ color: isActive ? "#6366F1" : "#0F0721" }}>
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Full category search panel */}
      {showSearch && (
        <div className="mt-2 mb-2 space-y-1.5">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-white divide-y divide-border">
            {filteredFull.map((cat) => (
              <button
                key={cat}
                onClick={() => selectFull(cat)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors"
                style={{ color: fullCat === cat ? "#6366F1" : "#0F0721", fontWeight: fullCat === cat ? 600 : 400 }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      {effectiveCategory && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-2 py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
          style={{ background: "#6366F1", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <><Loader2 className="inline h-3 w-3 animate-spin mr-1.5" />Saving…</>
          ) : usingHint ? (
            `Confirm: ${effectiveCategory.label} — remember for next time`
          ) : (
            `Save — remember for next time`
          )}
        </button>
      )}
    </div>
  );
}

// ── Standard notification item ────────────────────────────────────────────────

function NotificationItem({ n, onAnswered }: { n: ClientNotification; onAnswered: () => void }) {
  if (n.type === "unknown_charge") {
    return <UnknownChargeCard notification={n} onAnswered={onAnswered} />;
  }

  const Icon = getIcon(n.type);

  return (
    <div className={cn("border-l-4 pl-3 pr-4 py-3.5", BORDER_COLOR[n.severity] ?? "border-l-border")}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", ICON_COLOR[n.severity])} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
        </div>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function NotificationsPanel({ notifications, onClose, onAnswered }: NotificationsPanelProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-full bg-card border-l border-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-12">
              <CheckCircle className="h-9 w-9 text-[#1A5C38]" />
              <p className="text-sm font-medium text-foreground">You're all caught up ✓</p>
              <p className="text-xs text-muted-foreground">No notifications right now.</p>
            </div>
          ) : (
            notifications.map((n, i) => (
              <NotificationItem
                key={i}
                n={n}
                onAnswered={onAnswered ?? (() => {})}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
