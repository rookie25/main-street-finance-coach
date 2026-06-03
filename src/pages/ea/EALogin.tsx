// EA Portal login — email/password against Supabase Auth, Desired Labs branding.
// If already authenticated, redirect straight into the portal.
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEAAuth } from "@/hooks/useEAAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EALogin() {
  const { session, loading, signIn } = useEAAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/ea";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Clear any stale toasts when leaving the login page.
  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Desired Labs</div>
          <h1 className="font-display text-3xl font-semibold text-primary">EA Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to review client books.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="ea-email">Email</Label>
            <Input
              id="ea-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firm.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ea-password">Password</Label>
            <Input
              id="ea-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Trouble signing in?{" "}
          <a href="mailto:hello@desiredlabs.ai" className="text-accent hover:underline">
            hello@desiredlabs.ai
          </a>
        </p>
      </div>
    </div>
  );
}
