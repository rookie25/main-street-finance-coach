import { useEffect, useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { MonthlyCloseData, MonthlyCloseTask } from "@/lib/clientApi";
import { submitCashDrawer, uploadMonthlyCSV } from "@/lib/clientApi";

interface Props {
  data: MonthlyCloseData;
}

function monthLabel(period: string): string {
  try {
    const [y, m] = period.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year:  "numeric",
    });
  } catch {
    return period;
  }
}

export default function MonthlyCloseCard({ data }: Props) {
  const qc = useQueryClient();

  const [localTasks,   setLocalTasks]   = useState<MonthlyCloseTask[]>(data.tasks);
  const [dismissed,    setDismissed]    = useState(false);
  const [cashValue,    setCashValue]    = useState("");
  const [cashSaving,   setCashSaving]   = useState(false);
  const [ddFile,       setDdFile]       = useState<File | null>(null);
  const [amexFile,     setAmexFile]     = useState<File | null>(null);
  const [ddUploading,  setDdUploading]  = useState(false);
  const [amexUploading, setAmexUploading] = useState(false);
  const [ddResult,     setDdResult]     = useState<Record<string, unknown> | null>(null);
  const [amexResult,   setAmexResult]   = useState<Record<string, unknown> | null>(null);
  const [ddExpanded,   setDdExpanded]   = useState(false);
  const [amexExpanded, setAmexExpanded] = useState(false);

  const doneCount = localTasks.filter((t) => t.status !== "pending").length;
  const allDone   = localTasks.length > 0 && doneCount === localTasks.length;

  // Auto-dismiss 8 s after all done, then invalidate so the panel hides the card
  useEffect(() => {
    if (!allDone || dismissed) return;
    const t = setTimeout(() => {
      setDismissed(true);
      qc.invalidateQueries({ queryKey: ["monthly-close"] });
      qc.invalidateQueries({ queryKey: ["client", "notifications"] });
    }, 8000);
    return () => clearTimeout(t);
  }, [allDone, dismissed, qc]);

  if (dismissed) return null;

  function markDone(taskType: string) {
    setLocalTasks((prev) =>
      prev.map((t) => (t.task_type === taskType ? { ...t, status: "submitted" } : t))
    );
  }

  async function handleCashSave() {
    const amount = parseFloat(cashValue);
    if (isNaN(amount) || amount < 0) {
      toast.error("Enter a valid dollar amount");
      return;
    }
    setCashSaving(true);
    try {
      await submitCashDrawer(data.period!, amount);
      markDone("cash_drawer");
      toast.success("Cash drawer saved");
      qc.invalidateQueries({ queryKey: ["monthly-close"] });
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setCashSaving(false);
    }
  }

  async function handleUpload(taskType: "doordash_csv" | "amex_csv", file: File) {
    const setUploading = taskType === "doordash_csv" ? setDdUploading : setAmexUploading;
    const setResult    = taskType === "doordash_csv" ? setDdResult    : setAmexResult;
    setUploading(true);
    try {
      const res = await uploadMonthlyCSV(taskType, data.period!, file);
      markDone(taskType);
      setResult(res.result ?? {});
      const label = taskType === "doordash_csv" ? "DoorDash" : "Amex";
      toast.success(`${label} file uploaded`);
      qc.invalidateQueries({ queryKey: ["monthly-close"] });
      qc.invalidateQueries({ queryKey: ["client", "notifications"] });
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── All-done banner ────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div
        className="pl-3 pr-4 py-3.5 bg-emerald-50/60 rounded-r"
        style={{ borderLeft: "4px solid #16A34A" }}
      >
        <div className="flex items-start gap-2.5">
          <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-foreground leading-snug">
              Monthly close complete for {monthLabel(data.period!)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your EA will review and finalize your P&L.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Task renderers ─────────────────────────────────────────────────────────

  function renderCashDrawer(task: MonthlyCloseTask) {
    const instr = task.instructions;
    if (task.status !== "pending") {
      const amt = parseFloat(task.submitted_value ?? "0");
      return (
        <div className="flex items-center gap-2 py-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-xs font-medium text-foreground flex-1">{instr.title}</span>
          <span className="text-xs text-muted-foreground">
            ${isNaN(amt) ? "—" : amt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      );
    }
    return (
      <div className="py-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <span className="text-xs font-medium text-foreground">{instr.title}</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashValue}
              onChange={(e) => setCashValue(e.target.value)}
              placeholder="0.00"
              className="w-full pl-6 pr-2 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleCashSave}
            disabled={cashSaving || !cashValue}
            className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
            style={{ background: "#6366F1" }}
          >
            {cashSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    );
  }

  function renderCSVTask(
    task:        MonthlyCloseTask,
    taskType:    "doordash_csv" | "amex_csv",
    file:        File | null,
    setFile:     (f: File | null) => void,
    uploading:   boolean,
    result:      Record<string, unknown> | null,
    expanded:    boolean,
    setExpanded: (v: boolean) => void,
  ) {
    const instr = task.instructions;
    const icon  = taskType === "doordash_csv" ? "🛵" : "💳";

    if (task.status !== "pending") {
      let resultText = "Submitted";
      if (result) {
        if (taskType === "doordash_csv" && result.gross_sales != null) {
          const gs = Number(result.gross_sales);
          resultText = `Processed — $${gs.toLocaleString("en-US", { minimumFractionDigits: 2 })} gross added`;
        } else if (taskType === "amex_csv" && result.new_expenses != null) {
          const n = Number(result.new_expenses);
          resultText = `${n} new expense${n === 1 ? "" : "s"} — check notifications`;
        }
      }
      return (
        <div className="flex items-center gap-2 py-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-xs font-medium text-foreground flex-1">{instr.title}</span>
          <span className="text-[10px] text-muted-foreground text-right leading-snug max-w-[110px]">
            {resultText}
          </span>
        </div>
      );
    }

    return (
      <div className="py-2 space-y-1.5">
        {/* Header with expand toggle */}
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-base">{icon}</span>
          <span className="text-xs font-medium text-foreground flex-1">{instr.title}</span>
          {expanded
            ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
            : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </button>

        {/* Steps */}
        {expanded && instr.steps && (
          <ol className="ml-6 space-y-0.5 list-decimal list-inside">
            {instr.steps.map((step, i) => (
              <li key={i} className="text-[10px] text-muted-foreground">{step}</li>
            ))}
          </ol>
        )}
        {expanded && instr.help_url && (
          <a
            href={instr.help_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-6 block text-[10px] font-medium text-indigo-600 hover:underline"
          >
            Open {taskType === "doordash_csv" ? "DoorDash Portal" : "American Express"} →
          </a>
        )}

        {/* Upload zone */}
        <label className="block cursor-pointer">
          <div
            className="border-2 border-dashed rounded-lg p-2 text-center transition-colors"
            style={{
              borderColor: file ? "#6366F1" : "#E2E8F0",
              background:  file ? "#EEF2FF" : "white",
            }}
          >
            <Upload className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground truncate px-1">
              {file ? file.name : "Drop CSV here or tap to browse"}
            </p>
          </div>
          <input
            type="file"
            accept={instr.accepted_types}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {file && (
          <button
            onClick={() => handleUpload(taskType, file)}
            disabled={uploading}
            className="w-full py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: "#6366F1" }}
          >
            {uploading ? (
              <><Loader2 className="h-3 w-3 animate-spin" />Uploading…</>
            ) : (
              "Upload File"
            )}
          </button>
        )}
      </div>
    );
  }

  // ── Card ───────────────────────────────────────────────────────────────────
  return (
    <div className="pl-3 pr-4 py-3.5 bg-indigo-50/30" style={{ borderLeft: "4px solid #6366F1" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">
          📋 Monthly Close — {monthLabel(data.period!)}
        </span>
        <span className="text-[10px] text-muted-foreground">{doneCount} of {localTasks.length} done</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-200 rounded-full mb-2.5 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${localTasks.length > 0 ? (doneCount / localTasks.length) * 100 : 0}%` }}
        />
      </div>

      <div className="border-t border-border/50 mb-0.5" />

      {/* Task rows */}
      <div className="divide-y divide-border/30">
        {localTasks.map((task) => (
          <div key={task.task_type}>
            {task.task_type === "cash_drawer" && renderCashDrawer(task)}
            {task.task_type === "doordash_csv" && renderCSVTask(
              task, "doordash_csv", ddFile, setDdFile,
              ddUploading, ddResult, ddExpanded, setDdExpanded,
            )}
            {task.task_type === "amex_csv" && renderCSVTask(
              task, "amex_csv", amexFile, setAmexFile,
              amexUploading, amexResult, amexExpanded, setAmexExpanded,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
