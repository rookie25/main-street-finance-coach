// EA Portal login — email/password or Google SSO against Supabase Auth.
// Includes inline forgot-password flow and a link to the self-service signup page.
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEAAuth } from "@/hooks/useEAAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function EALogin() {
  const { session, loading, signIn, signInWithGoogle, resetPassword } = useEAAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/ea";

  const [searchParams]               = useSearchParams();
  const wrongPortal                  = searchParams.get("error") === "wrong_portal";

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showReset,  setShowReset]  = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent,  setResetSent]  = useState(false);
  const [resetBusy,  setResetBusy]  = useState(false);

  useEffect(() => { return () => { toast.dismiss(); }; }, []);

  if (!loading && session) return <Navigate to={from} replace />;

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

  async function handleGoogle() {
    try {
      await signInWithGoogle();
      // Browser is redirected to Google — no further action here.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetBusy(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setResetBusy(false);
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

        {wrongPortal && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
            Please use the correct portal for your account.
          </div>
        )}

        {!showReset ? (
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card space-y-4">
            {/* Google SSO */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={submitting}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email / password */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="hover:text-accent hover:underline"
              >
                Forgot password?
              </button>
              <Link to="/ea/signup" className="hover:text-accent hover:underline">
                Request access
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card space-y-4">
            <h2 className="font-semibold text-primary">Reset your password</h2>
            {resetSent ? (
              <p className="text-sm text-muted-foreground">
                Check your inbox — we've sent a reset link to{" "}
                <strong>{resetEmail}</strong>.
              </p>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Your email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@firm.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resetBusy}>
                  {resetBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(""); }}
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Back to sign in
            </button>
          </div>
        )}

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
