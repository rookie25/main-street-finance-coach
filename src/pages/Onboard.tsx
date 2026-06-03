import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  getSession, submitOnboarding, createCheckout, ApiError,
  type OnboardSession,
} from "@/lib/onboardApi";
import StepBusiness, { type BusinessDetails } from "@/components/onboard/StepBusiness";
import StepIntegrations, { type Integrations } from "@/components/onboard/StepIntegrations";
import StepPayment from "@/components/onboard/StepPayment";
import StepSuccess from "@/components/onboard/StepSuccess";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; session: OnboardSession };

const STEPS = ["Business", "Integrations", "Payment", "Done"];

export default function Onboard() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const paidParam = params.get("paid") === "1";
  const canceled = params.get("canceled") === "1";
  // amount URL param is display-only; the backend session carries the authoritative value.
  const amountParam = params.get("amount");

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [business, setBusiness] = useState<BusinessDetails>({
    business_name: "", owner_name: "", email: "", phone: "", address: "", business_type: "",
  });
  const [integrations, setIntegrations] = useState<Integrations>({
    square_api_key: "", plaid_token: "", gmail_token: "",
  });

  useEffect(() => {
    let active = true;
    getSession(token)
      .then((session) => {
        if (!active) return;
        setLoad({ kind: "ready", session });
        // Returning from a successful Stripe redirect, or already completed → success.
        if (paidParam || session.status === "completed") setStep(3);
        else if (canceled) setStep(2);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof ApiError && err.status === 410
            ? "This onboarding link has expired. Please contact us for a new one."
            : err instanceof ApiError && err.status === 404
            ? "This onboarding link is invalid. Please check the link or contact us."
            : "We couldn't load your onboarding session. Please try again shortly.";
        setLoad({ kind: "error", message });
      });
    return () => { active = false; };
  }, [token, paidParam, canceled]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitOnboarding({
        token,
        business_name: business.business_name,
        owner_name: business.owner_name,
        email: business.email,
        phone: business.phone || undefined,
        address: business.address || undefined,
        business_type: business.business_type || undefined,
        square_api_key: integrations.square_api_key || undefined,
        plaid_token: integrations.plaid_token || undefined,
        gmail_token: integrations.gmail_token || undefined,
      });
      setStep(2);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong saving your details.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    setRedirecting(true);
    try {
      const { url } = await createCheckout(token);
      window.location.href = url; // hand off to Stripe-hosted checkout
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not start checkout. Please try again.");
      setRedirecting(false);
    }
  }

  if (load.kind === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading your onboarding…
        </div>
      </Shell>
    );
  }

  if (load.kind === "error") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-muted-foreground max-w-sm">{load.message}</p>
          <a href="mailto:hello@desiredlabs.com" className="text-accent hover:underline text-sm">
            hello@desiredlabs.com
          </a>
        </div>
      </Shell>
    );
  }

  const session = load.session;
  const amount = session.amount_due ?? (amountParam ? Number(amountParam) : null);

  return (
    <Shell>
      <Stepper step={step} />
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-card mt-6">
        {step === 0 && (
          <StepBusiness value={business} onChange={setBusiness} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <StepIntegrations
            value={integrations} onChange={setIntegrations}
            onBack={() => setStep(0)} onNext={handleSubmit} submitting={submitting}
          />
        )}
        {step === 2 && (
          <StepPayment
            amount={amount} currency={session.currency}
            onBack={() => setStep(1)} onPay={handlePay} redirecting={redirecting} canceled={canceled}
          />
        )}
        {step === 3 && <StepSuccess businessName={session.business_name} />}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-prose max-w-2xl py-12 md:py-16">
        <div className="text-center mb-2">
          <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Desired Labs</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">Client onboarding</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-6 ${i < step ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
