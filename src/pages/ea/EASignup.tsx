// Self-service EA signup — creates auth credentials and queues an approval request.
// Submitting does NOT grant portal access; Vishal must manually add the EA to
// ea_users + ea_clients before the backend returns 200 on any /ea/* route.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RAILWAY_URL = import.meta.env.VITE_RAILWAY_URL as string;

export default function EASignup() {
  const [fullName,  setFullName]  = useState("");
  const [firmName,  setFirmName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy,      setBusy]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/ea/signup-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          firm_name: firmName.trim() || null,
          email:     email.trim().toLowerCase(),
          password,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Request failed (${res.status})`);
      }
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Desired Labs</div>
          <h1 className="font-display text-3xl font-semibold text-primary">Request received</h1>
          <p className="text-sm text-muted-foreground">
            Your access request is pending review. You'll receive an email once your account is approved.
          </p>
          <p className="text-xs text-muted-foreground pt-2">
            <Link to="/ea/login" className="text-accent hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Desired Labs</div>
          <h1 className="font-display text-3xl font-semibold text-primary">Request EA access</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your account will be reviewed before access is granted.
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full name</Label>
              <Input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-firm">
                Firm name{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="signup-firm"
                type="text"
                autoComplete="organization"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="BMB &amp; Associates"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Work email</Label>
              <Input
                id="signup-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit request
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have access?{" "}
            <Link to="/ea/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
