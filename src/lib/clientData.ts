// Client Portal direct-Supabase layer (Component 4).
// Expense overrides are the ONLY thing the client writes directly to Supabase —
// read/written under RLS (is_client_schema()). The backend applies these overrides
// as a display layer when serving /client/expenses. All other data is read-only
// via the backend.
import { supabase } from "@/lib/supabase";

export interface ExpenseOverride {
  id:                   number;
  client_schema:        string;
  expense_id:           string;
  vendor_name_override: string | null;
  date_override:        string | null;
  category_override:    string | null;
  changed_by:           string;
  changed_at:           string;
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Upsert an expense override. Pass null for a field to leave it as-is (not overriding). */
export async function saveExpenseOverride(
  clientSchema: string,
  expenseId: string,
  fields: {
    vendorName?: string | null;
    date?: string | null;
    category?: string | null;
  },
): Promise<ExpenseOverride> {
  const { data: user } = await supabase.auth.getUser();
  const rows = unwrap(
    await supabase
      .from("expense_overrides")
      .upsert(
        {
          client_schema:        clientSchema,
          expense_id:           expenseId,
          vendor_name_override: fields.vendorName ?? null,
          date_override:        fields.date       ?? null,
          category_override:    fields.category   ?? null,
          changed_by:           user.user?.id,
          changed_at:           new Date().toISOString(),
        },
        { onConflict: "client_schema,expense_id" },
      )
      .select(),
  );
  return rows[0];
}

/** Delete an override (revert to original values). */
export async function deleteExpenseOverride(
  clientSchema: string,
  expenseId: string,
): Promise<void> {
  unwrap(
    await supabase
      .from("expense_overrides")
      .delete()
      .eq("client_schema", clientSchema)
      .eq("expense_id", expenseId)
      .select(),
  );
}

// Expense categories Mark can choose from in the override selector.
// Must stay in sync with VALID_CATEGORIES in main.py and the build_monthly_expenses
// pl_category values.
export const EXPENSE_CATEGORIES = [
  "Cost of Goods Sold",
  "Payroll",
  "Rent & Lease",
  "Utilities",
  "Supplies",
  "Marketing",
  "Equipment",
  "Meals & Entertainment",
  "Professional Services",
  "Insurance",
  "Bank & Merchant Fees",
  "Software & Subscriptions",
  "Repairs & Maintenance",
  "Taxes & Licenses",
  "Other",
] as const;
