// Client dashboard — upcoming payroll vs cash (A-Phase 2 surface).
// Self-contained: own query, renders nothing unless a MATERIAL payroll is due
// within 30 days (the backend applies the cluster + floor logic). Advisory.
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { getNextPayroll } from "@/lib/clientApi";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const TONE: Record<string, { bg: string; border: string; fg: string }> = {
  short:   { bg: "#FEF2F2", border: "#FECACA", fg: "#DC2626" },
  tight:   { bg: "#FFFBEB", border: "#FDE68A", fg: "#B45309" },
  covered: { bg: "#fff",    border: "#E2E8F0", fg: "#14161C" },
  unknown: { bg: "#fff",    border: "#E2E8F0", fg: "#14161C" },
};

export default function NextPayrollCard() {
  const { data } = useQuery({
    queryKey: ["client", "next-payroll"],
    queryFn:  getNextPayroll,
    staleTime: 10 * 60 * 1000,
  });

  if (!data || !data.available) return null;

  const status = data.status ?? "unknown";
  const tone = TONE[status] ?? TONE.unknown;
  const due = data.due_date
    ? new Date(data.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(91,91,214,0.10)" }}>
          <Users className="h-4 w-4" style={{ color: "#5B5BD6" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: "#14161C" }}>
            Next payroll ~{money(data.amount ?? 0)} · {due}
          </div>
          <div className="text-xs mt-0.5" style={{ color: tone.fg }}>
            {status === "short"
              ? `Checking ~${money(data.balance ?? 0)} — you'd be ~${money((data.amount ?? 0) - (data.balance ?? 0))} short.`
              : status === "tight"
              ? `Checking ~${money(data.balance ?? 0)} — covered but tight.`
              : status === "covered"
              ? `Checking ~${money(data.balance ?? 0)} — covered.`
              : `${data.days_until} day${data.days_until === 1 ? "" : "s"} away.`}
          </div>
        </div>
        <div className="text-xs shrink-0" style={{ color: "#64748B" }}>
          {data.days_until}d
        </div>
      </div>
      <div className="px-4 pb-2">
        <p className="text-[10px]" style={{ color: "#8A93A3" }}>
          Estimate from your recurring payroll — verify.
        </p>
      </div>
    </div>
  );
}
