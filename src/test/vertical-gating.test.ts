// Unit tests for the vertical-gating logic — which nav tabs and AI prompts a
// client sees based on their business type. This is core to multi-vertical
// onboarding (a coffee shop must NOT see Invoices; a contractor must), so it's
// worth locking down even though the rest of the layout is presentational.
import { describe, it, expect } from "vitest";
import { showsInvoices, buildNav } from "@/components/layout/ClientLayout";
import { verticalFor } from "@/pages/app/AppChat";

describe("showsInvoices", () => {
  it("hides Invoices for POS / food / retail verticals", () => {
    for (const t of ["coffee", "Coffee Shop", "cafe", "restaurant", "bakery", "bar",
                     "retail", "boutique", "grocery store", "ecommerce", "salon", "spa"]) {
      expect(showsInvoices(t)).toBe(false);
    }
  });

  it("shows Invoices for service / trades / construction (and unknown)", () => {
    for (const t of ["construction", "general contractor", "plumbing", "consulting",
                     "services", undefined, null, ""]) {
      expect(showsInvoices(t)).toBe(true);
    }
  });
});

describe("buildNav", () => {
  const tos = (items: ReturnType<typeof buildNav>) => items.map((i) => i.to);

  it("a coffee shop without billing: no Invoices, no Billing", () => {
    const nav = tos(buildNav("coffee", false));
    expect(nav).not.toContain("/app/invoices");
    expect(nav).not.toContain("/app/billing");
    expect(nav).toContain("/app");          // dashboard always present
    expect(nav).toContain("/app/reports");
  });

  it("a contractor without billing: Invoices yes, Billing no", () => {
    const nav = tos(buildNav("construction", false));
    expect(nav).toContain("/app/invoices");
    expect(nav).not.toContain("/app/billing");
  });

  it("billing flag adds the Billing tab", () => {
    expect(tos(buildNav("construction", true))).toContain("/app/billing");
    expect(tos(buildNav("coffee", true))).toContain("/app/billing");
  });

  it("Invoices is inserted right after Reports", () => {
    const nav = tos(buildNav("construction", false));
    expect(nav.indexOf("/app/invoices")).toBe(nav.indexOf("/app/reports") + 1);
  });

  it("never produces duplicate routes", () => {
    const nav = tos(buildNav("construction", true));
    expect(new Set(nav).size).toBe(nav.length);
  });
});

describe("verticalFor (AI prompt set)", () => {
  it("maps food/drink businesses to 'food'", () => {
    for (const t of ["Coffee Shop", "cafe", "Joe's Bakery", "restaurant", "brewpub", "pizzeria"]) {
      expect(verticalFor(t)).toBe("food");
    }
  });
  it("maps building trades to 'construction'", () => {
    for (const t of ["ABC Construction", "general contractor", "plumbing co", "HVAC services", "roofing"]) {
      expect(verticalFor(t)).toBe("construction");
    }
  });
  it("maps shops to 'retail'", () => {
    for (const t of ["My Boutique", "corner store", "retail shop", "the market"]) {
      expect(verticalFor(t)).toBe("retail");
    }
  });
  it("falls back to 'default' for unknown / empty", () => {
    for (const t of ["Law Firm", "consulting", "", undefined, null]) {
      expect(verticalFor(t)).toBe("default");
    }
  });
});
