import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CreditCard, Mail, FileSpreadsheet, ShieldCheck } from "lucide-react";

export interface Integrations {
  square_api_key: string;
  plaid_token: string;
  gmail_token: string;
}

// NOTE: real Plaid Link and Gmail OAuth require their own SDK/redirect flows wired
// to the backend (Plaid link-token exchange, Google OAuth consent). Those buttons
// are stubbed here; when implemented they should deposit their resulting token into
// plaid_token / gmail_token so /onboard/submit can encrypt and store it.

export default function StepIntegrations({
  value, onChange, onBack, onNext, submitting,
}: {
  value: Integrations;
  onChange: (v: Integrations) => void;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const set = <K extends keyof Integrations>(k: K, v: Integrations[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold text-primary">Connect your tools</h2>
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        Credentials are encrypted before storage and never shown again.
      </p>

      {/* Square */}
      <div className="rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4 text-accent" /> Square</div>
        <Label className="text-sm text-muted-foreground">Square access token</Label>
        <Input
          type="password"
          autoComplete="off"
          value={value.square_api_key}
          onChange={(e) => set("square_api_key", e.target.value)}
          placeholder="••••••••••••••••"
        />
      </div>

      {/* Plaid */}
      <div className="rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-accent" /> Bank (Plaid)</div>
        <p className="text-sm text-muted-foreground">Securely link your bank account through Plaid.</p>
        <Button type="button" variant="outline" disabled
          title="Plaid Link wiring pending">
          Connect with Plaid (coming soon)
        </Button>
      </div>

      {/* Gmail */}
      <div className="rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-accent" /> Gmail</div>
        <p className="text-sm text-muted-foreground">Authorize read access so we can pull receipts and invoices.</p>
        <Button type="button" variant="outline" disabled
          title="Gmail OAuth wiring pending">
          Authorize Gmail (coming soon)
        </Button>
      </div>

      {/* DoorDash */}
      <div className="rounded-2xl border border-border p-5 space-y-2">
        <div className="flex items-center gap-2 font-medium"><FileSpreadsheet className="h-4 w-4 text-accent" /> DoorDash</div>
        <p className="text-sm text-muted-foreground">
          DoorDash has no API for merchants. To include DoorDash income:
        </p>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
          <li>Open the <span className="font-medium">Merchant Portal</span> → Financials → Statements.</li>
          <li>Export the payout report as <span className="font-medium">CSV</span>.</li>
          <li>Email it to <a className="text-accent hover:underline" href="mailto:hello@desiredlabs.com">hello@desiredlabs.com</a> — we'll import it for you.</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="xl" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="button" variant="brand" size="xl" className="flex-1" onClick={onNext} disabled={submitting}>
          {submitting ? "Saving…" : "Continue to payment"}
        </Button>
      </div>
    </div>
  );
}
