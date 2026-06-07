// Protected-route guard for /app/*. Mirrors RequireAuth.tsx from the EA portal.
// If a session exists but the user is NOT in client_users, sign them out and
// hard-redirect to /ea/login?error=wrong_portal so they start fresh there.
// Network/query errors show a retry prompt — they never sign the user out.
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/lib/supabase";

export default function RequireClientAuth() {
  const { session, loading } = useClientAuth();
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);
  const [connError,   setConnError]   = useState(false);
  const [retryKey,    setRetryKey]    = useState(0);

  useEffect(() => {
    if (loading) return;

    setRoleChecked(false);
    setConnError(false);

    if (!session) {
      setRoleChecked(true);
      return;
    }

    let cancelled = false;
    supabase
      .from("client_users")
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
          // Valid session but user is not in client_users — wrong portal.
          await supabase.auth.signOut();
          window.location.replace("/ea/login?error=wrong_portal");
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

  if (loading || (session && !roleChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/app/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
