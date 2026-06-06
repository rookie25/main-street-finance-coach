import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced at startup in dev so a missing .env is obvious rather than a silent failure on submit.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in your project credentials.",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    // EA Portal (Component 3) relies on a persisted, auto-refreshed session so
    // Cliff stays logged in across reloads. Onboarding doesn't use Supabase auth,
    // so enabling this is safe for the rest of the app.
    persistSession: true,
    autoRefreshToken: true,
    // We use email/password sign-in, not magic-link/OAuth redirects, so there's
    // no auth fragment to parse out of the URL on public marketing routes.
    detectSessionInUrl: true,
  },
});
