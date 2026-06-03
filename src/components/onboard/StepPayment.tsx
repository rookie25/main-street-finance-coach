import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";

// The amount shown here is for display. The authoritative charge amount lives in
// the backend (onboarding_sessions.amount_due) and is used to build the Stripe
// Checkout Session, so a tampered URL param cannot change what is charged.
export default function StepPayment({
  amount, currency, onBack, onPay, redirecting, canceled,
}: {
  amount: number | null;
  currency: string;
  onBack: () => void;
  onPay: () => void;
  redirecting: boolean;
  canceled: boolean;
}) {
  const display =
    amount != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount)
      : "—";

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold text-primary">Payment</h2>

      {canceled && (
        <div className="rounded-xl bg-destructive/10 text-destructive text-sm p-3">
          Payment was canceled. You can try again whenever you're ready.
        </div>
      )}

      <div className="rounded-2xl border border-border p-6 text-center">
        <div className="text-sm text-muted-foreground">Amount due</div>
        <div className="font-display text-4xl font-semibold text-primary mt-1">{display}</div>
      </div>

      <Button
        type="button" variant="brand" size="xl" className="w-full"
        onClick={onPay} disabled={redirecting || amount == null}
      >
        {redirecting ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Redirecting to Stripe…</>
        ) : (
          <><Lock className="h-4 w-4" /> Pay securely with Stripe</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You'll be redirected to Stripe's secure checkout. We never see your card details.
      </p>

      <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={redirecting}>
        Back
      </Button>
    </div>
  );
}
