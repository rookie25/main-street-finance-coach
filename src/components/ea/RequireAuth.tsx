// Protected-route guard for /ea/*. While the session is resolving, show a
// spinner; once resolved, send unauthenticated visitors to /ea/login and
// remember where they were headed so login can bounce them back.
// If a session exists but the user is NOT in ea_users, sign them out and
// hard-redirect to /app/login?error=wrong_portal so they start fresh there.
// Network/query errors show a retry prompt — they never sign the user out.
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEAAuth } from "@/hooks/useEAAuth";
import { supabase } from "@/lib/supabase";

export default function RequireAuth() {
  const { session, loading } = useEAAuth();
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);
  const [connError,   setConnError]   = useState(false);
  const [retryKey,    setRetryKey]    = useState(0);

  useEffect(() => {
    if (loading) return;

    // Reset on every session change so a new sign-in always re-verifies.
    setRoleChecked(false);
    setConnError(false);

    if (!session) {
      setRoleChecked(true);
      return;
    }

    let cancelled = false;
    supabase
      .from("ea_users")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Network or RLS error — do NOT sign out; let the user retry.
          setConnError(true);
          return;
        }
        if (data) {
          setRoleChecked(true);
        } else {
          // Valid session but user is not in ea_users — wrong portal.
          await supabase.auth.signOut();
          window.location.replace("/app/login?error=wrong_portal");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setConnError(true);
      });

    return () => { cancelled = true; };
  }, [loading, session?.user.id, retryKey]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (connError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">Connection error — tap to retry</p>
        <button
          onClick={() => { setConnError(false); setRetryKey((k) => k + 1); }}
          className="text-sm text-accent underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show spinner while session resolves or role check is in flight.
  if (loading || (session && !roleChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/ea/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
