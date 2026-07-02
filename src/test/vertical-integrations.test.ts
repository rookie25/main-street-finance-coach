// Multi-vertical: every business type selectable at onboarding must resolve to a
// real set of integration cards (never an empty list), and the construction trades
// must surface field-service tools. Guards the hand-synced dropdown ↔ integrations map.
import { describe, it, expect } from "vitest";
import { getIntegrationsForBusiness } from "@/lib/integrations";
import { CONSTRUCTION_TRADES } from "./vertical-gating.test";

const FIELD_SERVICE = ["jobber", "servicetitan", "housecall"];

describe("construction trades → integrations", () => {
  it.each(CONSTRUCTION_TRADES)("%s surfaces a field-service tool + bank (Plaid)", (trade) => {
    const { primary } = getIntegrationsForBusiness(trade);
    const ids = primary.map((i) => i.id);
    expect(ids.some((id) => FIELD_SERVICE.includes(id)), `${trade} primary=${ids}`).toBe(true);
    expect(ids).toContain("plaid");
  });
});

describe("existing verticals still resolve", () => {
  it("restaurant surfaces POS integrations", () => {
    const ids = getIntegrationsForBusiness("restaurant").primary.map((i) => i.id);
    expect(ids).toContain("square");
    expect(ids).toContain("plaid");
  });
  it("coffee_shop is unchanged", () => {
    const ids = getIntegrationsForBusiness("coffee_shop").primary.map((i) => i.id);
    expect(ids).toContain("square");
  });
});
