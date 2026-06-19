// Client dashboard — 13-week cash-flow forecast (A-Phase 3).
// Self-contained: own query, renders nothing if the forecast isn't available
// (no checking history) so it never disrupts the dashboard. Advisory estimate.
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getCashForecast } from "@/lib/clientApi";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CashForecastCard() {
  const { data } = useQuery({
    queryKey: ["client", "cash-forecast"],
    queryFn:  () => getCashForecast(13),
    staleTime: 10 * 60 * 1000,
  });

  if (!data || !data.available || !data.points?.length) return null;

  const low = data.low_point;
  const dipsNegative = (low?.balance ?? 0) < 0;
  const chartData = data.points.map((p) => ({ wk: `W${p.week}`, balance: p.balance }));

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-border">
      <div className="px-4 pt-4 pb-1 flex items-baseline justify-between gap-2">
        <span className="font-bold text-sm" style={{ color: "#14161C" }}>13-Week Cash Forecast</span>
        <span className="text-xs" style={{ color: "#94A3B8" }}>
          now {money(data.start_balance ?? 0)}
        </span>
      </div>
      <div className="px-1 pt-2" style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cashFc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B5BD6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#5B5BD6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="wk" tick={{ fontSize: 10, fill: "#94A3B8" }} interval={2} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} width={48}
                   tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => money(Number(v))} labelStyle={{ color: "#64748B" }} />
            <Area type="monotone" dataKey="balance" stroke="#5B5BD6" strokeWidth={2} fill="url(#cashFc)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-3 pt-1">
        <p className="text-xs" style={{ color: dipsNegative ? "#DC2626" : "#64748B", lineHeight: 1.5 }}>
          {dipsNegative
            ? `Projected to dip to ${money(low!.balance)} around week ${low!.week} — plan ahead.`
            : `Projected low ~${money(low?.balance ?? 0)} (week ${low?.week ?? 0}).`}
        </p>
        <p className="text-[10px] mt-1" style={{ color: "#AEB4C0" }}>{data.disclaimer}</p>
      </div>
    </div>
  );
}
