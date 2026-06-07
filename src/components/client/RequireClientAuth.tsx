// Protected-route guard for /app/*. Mirrors RequireAuth.tsx from the EA portal.
// If a session exists but the user is NOT in client_users, sign them out and
// hard-redirect to /ea/login?error=wrong_portal so they start fresh there.
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/lib/supabase";

export default function RequireClientAuth() {
  const { session, loading } = useClientAuth();
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    setRoleChecked(false);

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
      .then(async ({ data }) => {
        if (cancelled) return;
        if (data) {
          setRoleChecked(true);
        } else {
          // Valid Supabase session but not a client user — clear and redirect.
          await supabase.auth.signOut();
          window.location.replace("/ea/login?error=wrong_portal");
        }
      });

    return () => { cancelled = true; };
  }, [loading, session?.user.id]);  // eslint-disable-line react-hooks/exhaustive-deps

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
