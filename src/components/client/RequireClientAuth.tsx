// Protected-route guard for /app/*. Mirrors RequireAuth.tsx from the EA portal.
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useClientAuth } from "@/hooks/useClientAuth";

export default function RequireClientAuth() {
  const { session, loading } = useClientAuth();
  const location = useLocation();

  if (loading) {
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
