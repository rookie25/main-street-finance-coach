// Client dashboard — "Help categorize these" (owner side of the suspense loop).
// The owner explains their own uncategorized transactions in plain language; their
// accountant turns that into the correct books. No accounting jargon, ever.
// Self-contained: renders nothing when there's nothing to clarify.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HelpCircle, Loader2, CheckCircle2 } from "lucide-react";
import {
  getSuspenseQuestions, answerSuspenseQuestion, ApiError, type SuspenseQuestion,
} from "@/lib/clientApi";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Plain-language choices (owner never sees GL buckets). Keys match the backend map.
const CHOICES: { value: string; label: string }[] = [
  { value: "vendor_expense", label: "A supplier or business cost" },
  { value: "owner_personal", label: "I paid myself / personal" },
  { value: "loan_payment",   label: "A loan or financing payment" },
  { value: "card_payment",   label: "Paying off a credit card" },
  { value: "equipment",      label: "Equipment or a big purchase" },
  { value: "other",          label: "Not sure / something else" },
];

const keyOf = (q: SuspenseQuestion) => `${q.merchant}|${q.category}`;

export default function SuspenseQuestionsCard() {
  const qc = useQueryClient();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["client", "suspense-questions"],
    queryFn:  getSuspenseQuestions,
    staleTime: 5 * 60 * 1000,
  });

  const answer = useMutation({
    mutationFn: (q: SuspenseQuestion) =>
      answerSuspenseQuestion({
        merchant: q.merchant || undefined,
        category: q.category || undefined,
        owner_category: picks[keyOf(q)],
        note: notes[keyOf(q)] || undefined,
      }),
    onSuccess: () => {
      toast.success("Thanks — sent to your accountant.");
      qc.invalidateQueries({ queryKey: ["client", "suspense-questions"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn’t send that — try again."),
  });

  // Only show items that still need the owner: unanswered, or the EA asked.
  const items = (data?.items ?? []).filter(
    (q) => q.status === "open" || q.status === "asked",
  );
  if (!data?.available || items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-border">
      <div className="px-4 pt-4 pb-1 flex items-baseline justify-between gap-2">
        <span className="font-bold text-sm" style={{ color: "#14161C" }}>
          Help categorize these
        </span>
        <span className="text-xs" style={{ color: "#64748B" }}>
          {items.length} to confirm
        </span>
      </div>
      <p className="px-4 text-xs" style={{ color: "#64748B" }}>
        We couldn’t tell what these payments were for. A quick tap tells your
        accountant how to book them.
      </p>

      <div className="px-4 py-3 space-y-3">
        {items.map((q) => {
          const k = keyOf(q);
          const picked = picks[k] ?? "";
          const pending = answer.isPending && answer.variables === q;
          return (
            <div key={k} className="rounded-xl border border-border p-3 space-y-2">
              <div>
                <div className="font-medium text-sm truncate" style={{ color: "#14161C" }}>
                  {q.merchant || "A payment"}
                </div>
                <div className="text-xs" style={{ color: "#64748B" }}>
                  {money(q.amount)} · {q.count} payment{q.count === 1 ? "" : "s"}
                  {q.dates?.[0] ? ` · since ${q.dates[0]}` : ""}
                </div>
                {q.ea_question && (
                  <p className="mt-1 flex items-start gap-1 text-xs" style={{ color: "#5B5BD6" }}>
                    <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Your accountant asks: {q.ea_question}
                  </p>
                )}
              </div>
              <select
                value={picked}
                onChange={(e) => setPicks((p) => ({ ...p, [k]: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">What was this?</option>
                {CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input
                type="text"
                value={notes[k] ?? ""}
                onChange={(e) => setNotes((p) => ({ ...p, [k]: e.target.value }))}
                placeholder="Add a detail (optional) — e.g. who or what"
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
              <button
                type="button"
                disabled={!picked || pending}
                onClick={() => answer.mutate(q)}
                className="h-8 px-3 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "#5B5BD6" }}
              >
                {pending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Send</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
