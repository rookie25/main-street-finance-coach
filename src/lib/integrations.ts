export type ConnectionMethod = "oauth" | "api_key" | "csv";
export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface Integration {
  id: string;
  name: string;
  method: ConnectionMethod;
  initials: string;
  bgColor: string;    // tailwind bg class for icon chip
  hint: string;       // help text shown under name
  oauthReady?: boolean; // true = live OAuth flow wired; false/absent = coming soon
}

export interface IntegrationState {
  status: ConnectionStatus;
  value: string;       // api key text, oauth token, or csv filename
  errorMsg?: string;
}

export const CATALOG: Record<string, Integration> = {
  square:      { id: "square",      name: "Square",       method: "oauth",   initials: "SQ", bgColor: "bg-neutral-900", hint: "Connect your Square account", oauthReady: true },
  shopify:     { id: "shopify",     name: "Shopify",      method: "oauth",   initials: "SH", bgColor: "bg-green-600",   hint: "Connect your Shopify store" },
  toast:       { id: "toast",       name: "Toast",        method: "api_key", initials: "TS", bgColor: "bg-red-600",     hint: "Toast → Settings → API Access → copy key" },
  clover:      { id: "clover",      name: "Clover",       method: "api_key", initials: "CL", bgColor: "bg-green-500",   hint: "Clover → Dashboard → API tokens" },
  lightspeed:  { id: "lightspeed",  name: "Lightspeed",   method: "api_key", initials: "LS", bgColor: "bg-red-500",     hint: "Lightspeed → Account → API keys" },
  vagaro:      { id: "vagaro",      name: "Vagaro",       method: "api_key", initials: "VA", bgColor: "bg-purple-600",  hint: "Vagaro → Settings → API key" },
  mindbody:    { id: "mindbody",    name: "Mindbody",     method: "api_key", initials: "MB", bgColor: "bg-blue-700",    hint: "Mindbody → API Management → API key" },
  boulevard:   { id: "boulevard",   name: "Boulevard",    method: "api_key", initials: "BV", bgColor: "bg-indigo-600",  hint: "Boulevard → Settings → Integrations → API key" },
  glossgenius: { id: "glossgenius", name: "GlossGenius",  method: "api_key", initials: "GG", bgColor: "bg-pink-500",    hint: "GlossGenius → Settings → API key" },
  zenplanner:  { id: "zenplanner",  name: "Zen Planner",  method: "api_key", initials: "ZP", bgColor: "bg-teal-600",    hint: "Zen Planner → Settings → API" },
  pike13:      { id: "pike13",      name: "Pike13",       method: "api_key", initials: "P3", bgColor: "bg-orange-500",  hint: "Pike13 → Settings → API token" },
  mitchell1:   { id: "mitchell1",   name: "Mitchell 1",   method: "api_key", initials: "M1", bgColor: "bg-blue-800",    hint: "Mitchell 1 → Admin → API credentials" },
  shopware:    { id: "shopware",    name: "Shop-Ware",    method: "api_key", initials: "SW", bgColor: "bg-slate-700",   hint: "Shop-Ware → Admin → API keys" },
  tekmetric:   { id: "tekmetric",   name: "Tekmetric",    method: "api_key", initials: "TK", bgColor: "bg-cyan-700",    hint: "Tekmetric → Settings → Integrations" },
  printsmith:  { id: "printsmith",  name: "PrintSmith",   method: "csv",     initials: "PS", bgColor: "bg-amber-600",   hint: "File → Export → CSV, then upload here" },
  printavo:    { id: "printavo",    name: "Printavo",     method: "api_key", initials: "PA", bgColor: "bg-blue-500",    hint: "Printavo → Account Settings → API key" },
  jobber:      { id: "jobber",      name: "Jobber",       method: "api_key", initials: "JB", bgColor: "bg-green-700",   hint: "Jobber → Settings → API access → copy key" },
  servicetitan:{ id: "servicetitan",name: "ServiceTitan", method: "api_key", initials: "ST", bgColor: "bg-blue-900",    hint: "ServiceTitan → Settings → Integrations → API" },
  housecall:   { id: "housecall",   name: "Housecall Pro",method: "api_key", initials: "HC", bgColor: "bg-sky-600",     hint: "Housecall Pro → Settings → API keys" },
  doordash:    { id: "doordash",    name: "DoorDash",     method: "csv",     initials: "DD", bgColor: "bg-red-500",     hint: "Merchant Portal → Financials → Statements → Export CSV" },
  plaid:       { id: "plaid",       name: "Bank (Plaid)", method: "oauth",   initials: "PL", bgColor: "bg-blue-600",    hint: "Securely link your business bank account" },
  gmail:       { id: "gmail",       name: "Gmail",        method: "oauth",   initials: "GM", bgColor: "bg-red-500",     hint: "Grant read-only access for invoice & receipt capture" },
  csv_manual:  { id: "csv_manual",  name: "Manual CSV",   method: "csv",     initials: "CS", bgColor: "bg-slate-500",   hint: "Upload any CSV export from your system" },
};

// Business-type → ordered integration IDs, most relevant first.
// Excludes always-shown integrations (plaid, gmail); those are appended by getIntegrationsForBusiness().
const BUSINESS_SPECIFIC: Record<string, string[]> = {
  // Food & Beverage
  coffee_shop:    ["square", "toast", "clover", "lightspeed", "doordash"],
  restaurant:     ["square", "toast", "clover", "lightspeed", "doordash"],
  food_truck:     ["square", "toast", "doordash", "clover"],
  bakery:         ["square", "clover", "doordash", "toast"],
  bar:            ["square", "toast", "clover", "lightspeed"],
  ice_cream:      ["square", "clover", "doordash"],
  pizza:          ["square", "toast", "doordash", "clover"],
  sandwich_deli:  ["square", "toast", "doordash", "clover"],
  // Retail
  retail:         ["square", "shopify", "clover", "lightspeed"],
  clothing:       ["square", "shopify", "clover", "lightspeed"],
  shoe_store:     ["square", "shopify", "clover", "lightspeed"],
  gift_shop:      ["square", "shopify", "clover"],
  electronics:    ["square", "shopify", "lightspeed"],
  furniture:      ["square", "shopify", "lightspeed"],
  home_goods:     ["square", "shopify", "lightspeed"],
  sporting_goods: ["square", "shopify", "lightspeed"],
  pet_store:      ["square", "shopify", "clover"],
  // Salon & Spa
  hair_salon:     ["vagaro", "mindbody", "boulevard", "glossgenius", "square"],
  nail_salon:     ["vagaro", "mindbody", "boulevard", "glossgenius", "square"],
  spa:            ["vagaro", "mindbody", "boulevard", "glossgenius", "square"],
  massage:        ["vagaro", "mindbody", "boulevard", "glossgenius", "square"],
  // Fitness
  gym:            ["mindbody", "zenplanner", "pike13", "square"],
  fitness_studio: ["mindbody", "zenplanner", "pike13", "square"],
  yoga:           ["mindbody", "zenplanner", "pike13"],
  pilates:        ["mindbody", "zenplanner", "pike13"],
  crossfit:       ["mindbody", "zenplanner", "pike13", "square"],
  // Auto
  auto_repair:    ["mitchell1", "shopware", "tekmetric"],
  mechanic:       ["mitchell1", "shopware", "tekmetric"],
  // Print
  print_shop:     ["printsmith", "printavo"],
  // Construction & Trades — field-service management tools (job/dispatch/invoicing).
  general_contractor: ["jobber", "servicetitan", "housecall"],
  plumbing:           ["servicetitan", "housecall", "jobber"],
  electrical:         ["servicetitan", "housecall", "jobber"],
  hvac:               ["servicetitan", "housecall", "jobber"],
  roofing:            ["jobber", "housecall", "servicetitan"],
  landscaping:        ["jobber", "housecall", "servicetitan"],
  concrete:           ["jobber", "servicetitan", "housecall"],
  // Generic
  service:        [],
  other:          [],
};

const ALWAYS_PRIMARY   = ["plaid", "gmail"];  // always in the first view
const ALWAYS_SECONDARY = ["csv_manual"];       // always in "add another"
const PRIMARY_LIMIT    = 3;                    // max business-specific cards in primary view

export function getIntegrationsForBusiness(businessType: string): {
  primary: Integration[];
  secondary: Integration[];
} {
  const specific        = BUSINESS_SPECIFIC[businessType] ?? [];
  const primarySpecific = specific.slice(0, PRIMARY_LIMIT);
  const secondarySpecific = specific.slice(PRIMARY_LIMIT);

  return {
    primary: [
      ...primarySpecific.map((id) => CATALOG[id]).filter(Boolean),
      ...ALWAYS_PRIMARY.map((id) => CATALOG[id]).filter(Boolean),
    ],
    secondary: [
      ...secondarySpecific.map((id) => CATALOG[id]).filter(Boolean),
      ...ALWAYS_SECONDARY.map((id) => CATALOG[id]).filter(Boolean),
    ],
  };
}
