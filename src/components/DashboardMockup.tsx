// Abstract dashboard mockup as inline SVG — no faces, no garbled text artifacts
export default function DashboardMockup({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 720 460" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Financial dashboard preview">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(60 20% 99%)" />
            <stop offset="100%" stopColor="hsl(60 18% 95%)" />
          </linearGradient>
          <linearGradient id="green" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="hsl(147 56% 23%)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="hsl(147 56% 23%)" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="hsl(28 64% 47%)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="hsl(28 64% 47%)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Card */}
        <rect x="0" y="0" width="720" height="460" rx="16" fill="url(#bg)" />
        <rect x="0" y="0" width="720" height="460" rx="16" fill="none" stroke="hsl(40 15% 88%)" />

        {/* Top bar */}
        <circle cx="24" cy="24" r="5" fill="hsl(0 70% 65%)" />
        <circle cx="42" cy="24" r="5" fill="hsl(45 90% 60%)" />
        <circle cx="60" cy="24" r="5" fill="hsl(140 50% 55%)" />
        <rect x="540" y="16" width="160" height="16" rx="8" fill="hsl(40 15% 92%)" />

        {/* KPI cards */}
        <g transform="translate(24,64)">
          <rect width="200" height="92" rx="12" fill="white" stroke="hsl(40 15% 90%)" />
          <text x="16" y="28" fontFamily="Inter" fontSize="11" fill="hsl(0 0% 45%)" letterSpacing="1.5">REVENUE TODAY</text>
          <text x="16" y="58" fontFamily="Playfair Display" fontSize="26" fontWeight="600" fill="hsl(147 56% 23%)">$4,287</text>
          <text x="16" y="78" fontFamily="Inter" fontSize="11" fill="hsl(140 50% 35%)">▲ 12.4% vs avg</text>
        </g>
        <g transform="translate(236,64)">
          <rect width="200" height="92" rx="12" fill="white" stroke="hsl(40 15% 90%)" />
          <text x="16" y="28" fontFamily="Inter" fontSize="11" fill="hsl(0 0% 45%)" letterSpacing="1.5">EXPENSES MTD</text>
          <text x="16" y="58" fontFamily="Playfair Display" fontSize="26" fontWeight="600" fill="hsl(0 0% 17%)">$18,402</text>
          <text x="16" y="78" fontFamily="Inter" fontSize="11" fill="hsl(0 0% 45%)">73 transactions</text>
        </g>
        <g transform="translate(448,64)">
          <rect width="248" height="92" rx="12" fill="white" stroke="hsl(40 15% 90%)" />
          <text x="16" y="28" fontFamily="Inter" fontSize="11" fill="hsl(0 0% 45%)" letterSpacing="1.5">NET MARGIN</text>
          <text x="16" y="58" fontFamily="Playfair Display" fontSize="26" fontWeight="600" fill="hsl(28 64% 47%)">22.8%</text>
          <text x="16" y="78" fontFamily="Inter" fontSize="11" fill="hsl(140 50% 35%)">▲ 3.1pts this month</text>
        </g>

        {/* Chart */}
        <g transform="translate(24,180)">
          <rect width="412" height="240" rx="12" fill="white" stroke="hsl(40 15% 90%)" />
          <text x="20" y="32" fontFamily="Playfair Display" fontSize="16" fontWeight="600" fill="hsl(0 0% 17%)">Revenue · 30 days</text>

          {/* Grid */}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="20" x2="392" y1={70 + i * 40} y2={70 + i * 40} stroke="hsl(40 15% 94%)" />
          ))}

          {/* Area path */}
          <path
            d="M20,180 L60,150 L100,160 L140,120 L180,135 L220,95 L260,110 L300,80 L340,95 L380,70 L392,75 L392,210 L20,210 Z"
            fill="url(#green)"
          />
          <path
            d="M20,180 L60,150 L100,160 L140,120 L180,135 L220,95 L260,110 L300,80 L340,95 L380,70 L392,75"
            fill="none"
            stroke="hsl(147 56% 23%)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Gold overlay line */}
          <path
            d="M20,170 L60,165 L100,140 L140,150 L180,115 L220,125 L260,90 L300,100 L340,75 L380,85 L392,80"
            fill="none"
            stroke="hsl(28 64% 47%)"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <circle cx="380" cy="70" r="4" fill="hsl(147 56% 23%)" />
        </g>

        {/* Right column: feed */}
        <g transform="translate(448,180)">
          <rect width="248" height="240" rx="12" fill="white" stroke="hsl(40 15% 90%)" />
          <text x="20" y="32" fontFamily="Playfair Display" fontSize="16" fontWeight="600" fill="hsl(0 0% 17%)">Today's activity</text>

          {[
            { y: 60, label: "Square sale", val: "+$148", color: "hsl(147 56% 23%)" },
            { y: 100, label: "Receipt · In-app", val: "−$42", color: "hsl(0 0% 30%)" },
            { y: 140, label: "Sales tax accrued", val: "$23", color: "hsl(28 64% 47%)" },
            { y: 180, label: "Vendor invoice", val: "−$310", color: "hsl(0 0% 30%)" },
          ].map((r) => (
            <g key={r.y} transform={`translate(20,${r.y})`}>
              <circle cx="6" cy="14" r="4" fill={r.color} />
              <text x="20" y="12" fontFamily="Inter" fontSize="12" fill="hsl(0 0% 17%)">{r.label}</text>
              <text x="20" y="28" fontFamily="Inter" fontSize="10" fill="hsl(0 0% 50%)">categorized · 2 min ago</text>
              <text x="208" y="18" fontFamily="Inter" fontSize="13" fontWeight="600" fill={r.color} textAnchor="end">{r.val}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
