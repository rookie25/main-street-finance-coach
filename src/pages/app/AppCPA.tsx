// Client Portal — CPA hub: Messages + Documents with your CPA, in one place.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import AppMessages from "./AppMessages";
import AppDocuments from "./AppDocuments";

export default function AppCPA() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") === "documents" ? "documents" : "messages";
  const [tab, setTab] = useState<"messages" | "documents">(initial);

  function select(t: "messages" | "documents") {
    setTab(t);
    setParams(t === "documents" ? { tab: "documents" } : {}, { replace: true });
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 8rem)" }}>
      {/* Tab bar */}
      <div className="flex border-b border-border bg-background shrink-0">
        {(["messages", "documents"] as const).map((t) => (
          <button
            key={t}
            onClick={() => select(t)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "messages" ? "Messages" : "Documents"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {tab === "messages"
          ? <AppMessages embedded />
          : <div className="h-full overflow-y-auto"><AppDocuments embedded /></div>}
      </div>
    </div>
  );
}
