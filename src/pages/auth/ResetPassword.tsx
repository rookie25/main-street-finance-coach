// Handles the password-reset redirect from Supabase email.
// Supabase redirects here with #access_token=...&type=recovery in the URL hash.
// detectSessionInUrl: true in supabase.ts parses this automatically and fires
// onAuthStateChange with event PASSWORD_RECOVERY, giving us the recovery session.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageState = "waiting" | "ready" | "success" | "error";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pageState,  setPageState]  = useState<PageState>("waiting");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // A genuinely expired/invalid link comes back from Supabase with an error in
    // the URL hash (e.g. #error=access_denied&error_code=otp_expired) — show the
    // error immediately rather than waiting out the timeout.
    const hashErr = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error")
                  || new URLSearchParams(window.location.search).get("error");
    if (hashErr) {
      setPageState("error");
      return;
    }

    let cancelled = false;
    const toReady = () => { if (!cancelled) setPageState((cur) => (cur === "waiting" ? "ready" : cur)); };

    // detectSessionInUrl parses the recovery token when the Supabase client
    // initializes — which can run BEFORE this component mounts, so the
    // PASSWORD_RECOVERY event may already have fired and been missed. Check for
    // an already-established session so a valid link isn't reported as expired.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) toReady();
    });

    // Also catch the event if it arrives after mount.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        toReady();
      }
    });

    // Fallback: if nothing established a session within 10s, the link is bad.
    const timer = setTimeout(() => {
      setPageState((cur) => (cur === "waiting" ? "error" : cur));
    }, 10_000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPageState("success");
      // Both portals share this page — redirect to the EA login as the default.
      // Clients land here too; either portal login will work with the new password.
      setTimeout(() => navigate("/ea/login"), 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-theme min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Desired Labs</div>
          <h1 className="font-display text-3xl font-semibold text-primary">Set new password</h1>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card">
          {pageState === "waiting" && (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Verifying reset link…</p>
            </div>
          )}

          {pageState === "error" && (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-destructive font-medium">Invalid or expired link</p>
              <p className="text-sm text-muted-foreground">
                Password reset links expire after 1 hour. Please request a new one.
              </p>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => navigate("/ea/login")}
              >
                Back to sign in
              </Button>
            </div>
          )}

          {pageState === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Same as above"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}

          {pageState === "success" && (
            <div className="text-center space-y-2 py-4">
              <p className="text-sm font-medium text-primary">Password updated.</p>
              <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
