// Client Portal — Billing (Component 4).
// Shows the client's subscription plan/status and links to Stripe-hosted
// Checkout (subscribe) and the Customer Portal (manage). All payment UI is
// Stripe-hosted, so this page never touches card/bank details (no PCI scope).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CreditCard, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { getBillingStatus, startSubscribeCheckout, openBillingPortal } from "@/lib/clientApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const STATUS_LABEL: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:   { text: "Active",   variant: "default" },
  trialing: { text: "Trial",    variant: "secondary" },
  past_due: { text: "Past due", variant: "destructive" },
  canceled: { text: "Canceled", variant: "outline" },
  unpaid:   { text: "Unpaid",   variant: "destructive" },
};

export default function AppBilling() {
  const [params] = useSearchParams();
  const [busy, setBusy] = useState<"subscribe" | "portal" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["client", "billing"],
    queryFn:  getBillingStatus,
    // After returning from Stripe Checkout the webhook may lag a beat; refetch.
    refetchInterval: params.get("subscribed") ? 3000 : false,
  });

  async function go(kind: "subscribe" | "portal") {
    setErr(null);
    setBusy(kind);
    try {
      const { url } = kind === "subscribe" ? await startSubscribeCheckout() : await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(null);
    }
  }

  const status = data?.status ?? null;
  const badge  = status ? STATUS_LABEL[status] ?? { text: status, variant: "outline" as const } : null;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="font-display text-xl font-semibold text-primary">Billing</h1>

      {params.get("subscribed") && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span>Thanks! Your subscription is being activated — this can take a few seconds.</span>
          </CardContent>
        </Card>
      )}

      {(isError || err) && (
        <p className="text-sm text-destructive">
          {err ?? (error instanceof Error ? error.message : "Failed to load billing")}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !data?.has_plan ? (
            <p className="text-sm text-muted-foreground">
              No plan is set up for your account yet. Please reach out to Desired Labs to get started.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {data.monthly_fee != null ? fmt(data.monthly_fee) : "—"}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}/ {data.interval === "year" ? "year" : "month"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Bookkeeping service</div>
                </div>
                {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
              </div>

              {status === "past_due" && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Your last payment didn't go through. Update your payment method to keep service active.</span>
                </div>
              )}

              {data.current_period_end && data.active && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(data.current_period_end).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              )}

              {data.active ? (
                <Button onClick={() => go("portal")} disabled={busy !== null} variant="outline" className="w-full">
                  {busy === "portal" ? "Opening…" : "Manage billing"}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => go("subscribe")} disabled={busy !== null} className="w-full">
                  {busy === "subscribe" ? "Redirecting…" : "Subscribe"}
                </Button>
              )}

              <p className="text-[11px] text-muted-foreground text-center">
                Payments are processed securely by Stripe. Pay by card or bank transfer (ACH).
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
