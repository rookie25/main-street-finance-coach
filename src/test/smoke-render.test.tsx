// Render smoke tests — mount key components with the data layer mocked and
// assert they render real content without throwing. These guard the class of
// bug that tsc + vite build do NOT catch: a component that compiles but crashes
// at render (bad hook order, malformed JSX, missing null-guards). Deliberately
// shallow — "does it render the important bits", not pixel/behaviour testing.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { WorksheetData } from "@/lib/eaApi";

// ── EAWorksheet ───────────────────────────────────────────────────────────────
// Guards the P&L / Balance-Sheet tables (recently wrapped in overflow-x-auto).
const worksheet: WorksheetData = {
  schema: "test", period: "2026-05",
  pl: {
    revenue_lines:   [{ key: "sq", label: "Square POS Sales", amount: 1000, base_amount: 1000, is_adjusted: false, adj_id: null }],
    tax_collected:   { amount: 50, is_adjusted: false },
    cogs_categories: [{ key: "c1", label: "City Bakin", amount: 200, base_amount: 200, is_adjusted: false, adj_id: null }],
    opex_categories: [{ key: "rent", label: "Rent & Lease", amount: 300, base_amount: 300, is_adjusted: false, adj_id: null }],
    revenue_gross: 1000, net_revenue: 950, cogs_total: 200, gross_profit: 750, opex_total: 300, net_income: 450,
  },
  bs: {
    assets:      { current: [{ id: "a1", label: "Bank", amount: 500, note: "", is_adjusted: false }], fixed: [], total_current: 500, total_fixed: 0, total: 500 },
    liabilities: { items: [], total: 0 },
    equity:      { items: [{ id: "e1", label: "Owner's Equity", amount: 500, note: "", is_adjusted: false }], total: 500 },
    total_liab_equity: 500, balanced: true,
  },
  adjustments: [],
};

vi.mock("@/lib/eaApi", () => ({
  getWorksheet:     vi.fn(() => Promise.resolve(worksheet)),
  saveAdjustment:   vi.fn(() => Promise.resolve({})),
  resetAdjustments: vi.fn(() => Promise.resolve()),
  worksheetExportUrl: vi.fn(() => "http://example.test/export.xlsx"),
}));

import EAWorksheet from "@/components/ea/EAWorksheet";

describe("EAWorksheet", () => {
  it("renders the P&L table rows once data loads", async () => {
    render(<EAWorksheet schema="test" month="2026-05" />);
    // toolbar renders immediately (pre-data)
    expect(await screen.findByText("Download Excel")).toBeInTheDocument();
    // a revenue row from the (wrapped) table renders after the fetch resolves
    expect(await screen.findByText("Square POS Sales")).toBeInTheDocument();
    expect(await screen.findByText("Rent & Lease")).toBeInTheDocument();
  });
});

// ── SupportChat ───────────────────────────────────────────────────────────────
// Props-based (no module mock needed) — pass stub load/send.
import SupportChat from "@/components/support/SupportChat";

describe("SupportChat", () => {
  it("renders the header and empty state without crashing", async () => {
    const load = vi.fn(() => Promise.resolve({ messages: [] }));
    const send = vi.fn(() => Promise.resolve({ id: "1", sender: "user" as const, body: "hi", created_at: new Date().toISOString() }));
    render(<SupportChat load={load} send={send} />);
    expect(screen.getByText("Desired Labs Support")).toBeInTheDocument();
    expect(await screen.findByText("How can we help?")).toBeInTheDocument();
  });
});
