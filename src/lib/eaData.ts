// EA work-product data layer (Component 3) — flags, approvals, category
// overrides, and monthly notes. These are read/written DIRECTLY against Supabase
// using Cliff's authenticated session; RLS (is_ea()) is the enforcement boundary,
// so there is no service-role key in the browser and no backend hop for writes.
import { supabase } from "@/lib/supabase";

export interface EAFlag {
  id: number;
  client_schema: string;
  month: string;
  line_item_id: string;
  flag_note: string;
  flagged_by: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface EAApproval {
  id: number;
  client_schema: string;
  month: string;
  approved_by: string;
  approved_at: string;
  notes: string | null;
}

export interface EAOverride {
  id: number;
  client_schema: string;
  expense_id: string;
  original_category: string | null;
  new_category: string;
  changed_by: string;
  changed_at: string;
}

export interface EANote {
  client_schema: string;
  month: string;
  note: string;
  updated_by: string | null;
  updated_at: string;
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function currentUserId(): Promise<string | undefined> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

// --- Flags ----------------------------------------------------------------

export async function setFlagResolved(id: number, resolved: boolean): Promise<void> {
  unwrap(
    await supabase
      .from("ea_flags")
      .update({
        resolved,
        resolved_by: resolved ? await currentUserId() : null,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select(),
  );
}

// --- Approvals ------------------------------------------------------------
export async function getApproval(schema: string, month: string): Promise<EAApproval | null> {
  return unwrap(
    await supabase
      .from("ea_approvals")
      .select("*")
      .eq("client_schema", schema)
      .eq("month", month)
      .maybeSingle(),
  );
}

export async function approveMonth(
  schema: string,
  month: string,
  notes?: string,
): Promise<EAApproval> {
  const rows = unwrap(
    await supabase
      .from("ea_approvals")
      .upsert(
        {
          client_schema: schema,
          month,
          approved_by: await currentUserId(),
          approved_at: new Date().toISOString(),
          notes: notes ?? null,
        },
        { onConflict: "client_schema,month" },
      )
      .select(),
  );
  if (!rows || rows.length === 0) {
    throw new Error("Insert succeeded but returned no data — possible RLS restriction");
  }
  return rows[0];
}

export async function unapproveMonth(schema: string, month: string): Promise<void> {
  unwrap(
    await supabase
      .from("ea_approvals")
      .delete()
      .eq("client_schema", schema)
      .eq("month", month)
      .select(),
  );
}

// --- Category overrides ---------------------------------------------------
export async function getOverrides(schema: string): Promise<EAOverride[]> {
  return unwrap(
    await supabase
      .from("ea_category_overrides")
      .select("*")
      .eq("client_schema", schema)
      .order("changed_at", { ascending: false }),
  );
}

export async function setOverride(
  schema: string,
  expenseId: string,
  newCategory: string,
  originalCategory?: string,
): Promise<EAOverride> {
  const rows = unwrap(
    await supabase
      .from("ea_category_overrides")
      .upsert(
        {
          client_schema: schema,
          expense_id: expenseId,
          original_category: originalCategory ?? null,
          new_category: newCategory,
          changed_by: await currentUserId(),
          changed_at: new Date().toISOString(),
        },
        { onConflict: "client_schema,expense_id" },
      )
      .select(),
  );
  if (!rows || rows.length === 0) {
    throw new Error("Insert succeeded but returned no data — possible RLS restriction");
  }
  return rows[0];
}

export async function deleteOverride(id: number): Promise<void> {
  unwrap(await supabase.from("ea_category_overrides").delete().eq("id", id).select());
}

// --- Notes ----------------------------------------------------------------
export async function getNote(schema: string, month: string): Promise<EANote | null> {
  return unwrap(
    await supabase
      .from("ea_notes")
      .select("*")
      .eq("client_schema", schema)
      .eq("month", month)
      .maybeSingle(),
  );
}

export async function saveNote(schema: string, month: string, note: string): Promise<EANote> {
  const rows = unwrap(
    await supabase
      .from("ea_notes")
      .upsert(
        {
          client_schema: schema,
          month,
          note,
          updated_by: await currentUserId(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_schema,month" },
      )
      .select(),
  );
  if (!rows || rows.length === 0) {
    throw new Error("Insert succeeded but returned no data — possible RLS restriction");
  }
  return rows[0];
}

// Common expense categories offered in the override dropdown. Adjust to match
// the chart of accounts as it firms up.
export const EXPENSE_CATEGORIES = [
  "Cost of Goods Sold",
  "Rent & Lease",
  "Payroll & Wages",
  "Payroll Taxes",
  "Utilities",
  "Marketing & Advertising",
  "Software & Subscriptions",
  "Insurance",
  "Bank & Merchant Fees",
  "Supplies",
  "Travel & Meals",
  "Professional Services",
  "Repairs & Maintenance",
  "Taxes & Licenses",
  "Owner Draw",
  "Uncategorized",
  "Other",
] as const;
