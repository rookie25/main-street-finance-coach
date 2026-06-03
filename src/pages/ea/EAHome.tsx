// EA Portal landing (/ea) — shown when no client is selected. Simple guidance
// to pick a client from the sidebar.
import { Users } from "lucide-react";

export default function EAHome() {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-primary">Welcome to the EA Portal</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a client from the sidebar to review their monthly P&amp;L and balance sheet,
          flag line items, override categories, leave notes, and approve the month.
        </p>
      </div>
    </div>
  );
}
