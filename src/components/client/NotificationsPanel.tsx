import { X, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import type { ClientNotification } from "@/lib/clientApi";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  notifications: ClientNotification[];
  onClose: () => void;
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

function NotificationItem({ n }: { n: ClientNotification }) {
  const Icon =
    n.type === "report_ready"
      ? FileText
      : n.severity === "info"
      ? CheckCircle
      : AlertTriangle;

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

export default function NotificationsPanel({ notifications, onClose }: NotificationsPanelProps) {
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
            notifications.map((n, i) => <NotificationItem key={i} n={n} />)
          )}
        </div>
      </div>
    </>
  );
}
