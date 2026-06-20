// EA Portal — client-assignment offers (/ea/offers). Each card shows the
// business brief; the EA accepts (→ becomes assigned) or declines.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Building2, Banknote, CreditCard, FileClock, MapPin } from "lucide-react";
import { listOffers, acceptOffer, rejectOffer, type EAOffer } from "@/lib/eaApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function fmtMoney(n: number | null | undefined): string {
  return n == null ? "—" : "$" + Math.round(n).toLocaleString("en-US");
}

function expiresLabel(iso: string): string {
  const h = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
  if (h <= 0) return "expiring soon";
  if (h < 24) return `expires in ${h}h`;
  return `expires in ${Math.round(h / 24)}d`;
}

function OfferCard({ offer, onDone }: { offer: EAOffer; onDone: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const b = offer.brief ?? {};

  const accept = useMutation({
    mutationFn: () => acceptOffer(offer.id),
    onSuccess: (r) => {
      toast.success(`You're now assigned to ${b.business_name ?? "this client"}.`);
      void qc.invalidateQueries({ queryKey: ["ea"] });
      onDone();
      navigate(`/ea/clients/${encodeURIComponent(r.client_schema)}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not accept the offer."),
  });

  const reject = useMutation({
    mutationFn: () => rejectOffer(offer.id),
    onSuccess: () => {
      toast.success("Offer declined.");
      void qc.invalidateQueries({ queryKey: ["ea", "offers"] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not decline the offer."),
  });

  const busy = accept.isPending || reject.isPending;

  const facts: Array<{ icon: typeof Building2; label: string }> = [
    { icon: Building2, label: b.vertical || "Business" },
    { icon: Banknote,  label: `${b.bank_accounts ?? 0} bank account${(b.bank_accounts ?? 0) === 1 ? "" : "s"}` },
    { icon: CreditCard, label: b.square_connected ? "Square connected" : "No POS yet" },
    { icon: FileClock, label: b.books_status === "live" ? "Books live" : "Setup / historical" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-lg font-semibold text-foreground truncate">
            {b.business_name || offer.client_schema}
          </div>
          {b.owner_name && (
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {b.owner_name}
            </div>
          )}
        </div>
        <span className="shrink-0 text-[11px] uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          {expiresLabel(offer.expires_at)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {facts.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary rounded-full px-2.5 py-1">
            <f.icon className="h-3 w-3" /> {f.label}
          </span>
        ))}
        {b.monthly_fee != null && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
            {fmtMoney(b.monthly_fee)}/mo
          </span>
        )}
      </div>

      {b.notes && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{b.notes}</p>}

      <div className="flex gap-2 mt-4">
        <Button className="flex-1" onClick={() => accept.mutate()} disabled={busy}>
          {accept.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => reject.mutate()} disabled={busy}>
          {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Decline
        </Button>
      </div>
    </div>
  );
}

export default function EAOffers() {
  const { data: offers, isLoading, refetch } = useQuery({ queryKey: ["ea", "offers"], queryFn: listOffers });
  const [, force] = useState(0);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-primary">Client Offers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          New clients offered to you — accept to start working, or decline.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-[180px] w-full rounded-xl" />)}</div>
      ) : (offers ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending offers right now.</p>
      ) : (
        <div className="space-y-4">
          {offers!.map((o) => (
            <OfferCard key={o.id} offer={o} onDone={() => { void refetch(); force((n) => n + 1); }} />
          ))}
        </div>
      )}
    </div>
  );
}
