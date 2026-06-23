// Client dashboard — forward P&L + cash forecast (Phase 4, Layer B).
// Read-only projection from the clean actuals + structured cost layers (loan
// amortization, repurposed fixed_costs). Self-contained: renders nothing until a
// forecast is available. Advisory — never writes to the books.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Info } from "lucide-react";
import { getPnlForecast } from "@/lib/clientApi";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const shortMonth = (p: string) => {
  const [y, m] = p.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "short" });
};

export default function PnlForecastCard() {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const { data } = useQuery({
    queryKey: ["client", "pnl-forecast"],
    queryFn:  () => getPnlForecast(6),
    staleTime: 10 * 60 * 1000,
  });

  if (!data || !data.available || !data.rows?.length) return null;

  const rows = data.rows;
  const chart = rows.map((r) => ({
    m: shortMonth(r.period),
    "Net income": Math.round(r.net_income),
    Cash: Math.round(r.projected_cash),
  }));
  const cashDips = rows.some((r) => r.projected_cash < 0);
  const firstDip = rows.find((r) => r.projected_cash < 0);
  const endCash = rows[rows.length - 1].projected_cash;
  const avgNet = Math.round(rows.reduce((s, r) => s + r.net_income, 0) / rows.length);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-border">
      <div className="px-4 pt-4 pb-1 flex items-baseline justify-between gap-2">
        <span className="font-bold text-sm" style={{ color: "#14161C" }}>
          {data.horizon}-Month Forecast
        </span>
        <span className="text-xs" style={{ color: "#64748B" }}>
          ~{money(avgNet)}/mo net income
        </span>
      </div>

      <div className="px-1 pt-2" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} width={48}
                   tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => money(Number(v))} labelStyle={{ color: "#64748B" }} />
            <Bar dataKey="Net income" fill="#5B5BD6" radius={[4, 4, 0, 0]} barSize={18} />
            <Line type="monotone" dataKey="Cash" stroke="#0EA5E9" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="px-4 pb-3 pt-1">
        <p className="text-xs" style={{ color: cashDips ? "#DC2626" : "#64748B", lineHeight: 1.5 }}>
          {cashDips && firstDip
            ? `Profitable (~${money(avgNet)}/mo), but projected cash dips below $0 around ${shortMonth(firstDip.period)} — debt service + owner draws outrun profit until then.`
            : `Projected cash ends near ${money(endCash)} in ${shortMonth(rows[rows.length - 1].period)}.`}
        </p>
        <button
          type="button"
          onClick={() => setShowAssumptions((s) => !s)}
          className="mt-2 inline-flex items-center gap-1 text-[11px]"
          style={{ color: "#8A93A3" }}
        >
          <Info className="h-3 w-3" /> {showAssumptions ? "Hide" : "How this is calculated"}
        </button>
        {showAssumptions && data.assumptions && (
          <ul className="mt-2 space-y-1 text-[11px]" style={{ color: "#64748B" }}>
            {data.assumptions.map((a, i) => (
              <li key={i} className="flex gap-1.5">
                <span style={{ color: "#CBD5E1" }}>•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] mt-2" style={{ color: "#8A93A3" }}>
          Advisory projection from your recent trend and known costs — not a guarantee.
        </p>
      </div>
    </div>
  );
}
