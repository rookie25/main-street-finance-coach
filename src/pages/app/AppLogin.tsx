// Client Portal login (Component 4) — email/password or Google SSO.
// Includes inline forgot-password flow matching the EA portal pattern.
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClientAuth } from "@/hooks/useClientAuth";
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

const PANEL_FEATURES = [
  "Daily financial briefings at 6:45 AM",
  "Automated bookkeeping & categorization",
  "Monthly CPA-ready package",
  "Real-time cash flow visibility",
];

function NeonPanel() {
  return (
    <div
      className="hidden lg:flex flex-1 flex-col items-center justify-center px-12 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #14161C 0%, #1B1A2E 40%, #141A2C 100%)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse at 80% 10%, rgba(99,102,241,0.25) 0%, transparent 50%)",
            "radial-gradient(ellipse at 10% 80%, rgba(59,130,246,0.20) 0%, transparent 50%)",
            "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 40%)",
          ].join(", "),
        }}
      />
      <div className="relative text-center mb-10">
        <div className="font-display text-3xl font-semibold mb-1">
          <span style={{ color: "#5B5BD6" }}>Desired</span>{" "}
          <span style={{ color: "#7C7CF0" }}>Labs</span>
        </div>
        <div className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>AI-powered financial operations</div>
      </div>
      <div className="relative space-y-4 max-w-xs w-full">
        {PANEL_FEATURES.map((feat) => (
          <div key={feat} className="flex items-center gap-3">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(99,102,241,0.3)", border: "1px solid rgba(99,102,241,0.5)" }}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3 3 6-6" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{feat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppLogin() {
  const { session, loading, signIn, signInWithGoogle, resetPassword } = useClientAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";

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
      // signIn resolved => auth succeeded and the session is set synchronously,
      // so navigate immediately. Don't rely on the reactive <Navigate> re-render
      // (that lag is what required a second click).
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
    <div className="app-theme min-h-screen flex bg-background">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center px-6" style={{ background: "#F8FAFC" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Desired Labs</div>
            <h1 className="font-display text-3xl font-semibold text-primary">Your Portal</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to view your business financials.</p>
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
                disabled={submitting || loading}
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
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Password</Label>
                  <Input
                    id="client-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ background: "linear-gradient(135deg, #5B5BD6, #8B5CF6)" }}
                  disabled={submitting || loading}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-xs text-muted-foreground hover:text-accent hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card space-y-4">
              <h2 className="font-semibold text-primary">Reset your password</h2>
              {resetSent ? (
                <p className="text-sm text-muted-foreground">
                  Check your inbox — a reset link has been sent to{" "}
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
                      placeholder="you@yourbusiness.com"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full text-white"
                    style={{ background: "linear-gradient(135deg, #5B5BD6, #8B5CF6)" }}
                    disabled={resetBusy}
                  >
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

      {/* Right — Neon Frost panel */}
      <NeonPanel />
    </div>
  );
}
