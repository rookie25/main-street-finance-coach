// Protected-route guard for /ea/*. While the session is resolving, show a
// spinner; once resolved, send unauthenticated visitors to /ea/login and
// remember where they were headed so login can bounce them back.
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEAAuth } from "@/hooks/useEAAuth";

export default function RequireAuth() {
  const { session, loading } = useEAAuth();
  const location = useLocation();

  if (loading) {
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
