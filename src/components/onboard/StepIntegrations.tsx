import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clipboard, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type Integration,
  type ConnectionStatus,
  getIntegrationsForBusiness,
} from "@/lib/integrations";

// Record<integrationId, string value (api key, oauth token, csv filename)>
export type IntegrationValues = Record<string, string>;

interface CardState {
  status: ConnectionStatus;
  draft: string;   // the text field value before "Save"
  errorMsg?: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === "idle")       return <span className="text-xs text-muted-foreground">Not connected</span>;
  if (status === "connecting") return <span className="text-xs text-amber-500 animate-pulse">Connecting…</span>;
  if (status === "connected")  return <span className="text-xs font-medium text-green-600">✓ Connected</span>;
  return <span className="text-xs text-destructive">✗ Error</span>;
}

// ── Method badge ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: Integration["method"] }) {
  const map = {
    oauth:   "bg-blue-50 text-blue-700 border-blue-200",
    api_key: "bg-amber-50 text-amber-700 border-amber-200",
    csv:     "bg-slate-100 text-slate-600 border-slate-200",
  };
  const label = { oauth: "OAuth", api_key: "API Key", csv: "CSV" }[method];
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${map[method]}`}>
      {label}
    </span>
  );
}

// ── Initials icon ─────────────────────────────────────────────────────────────

function IntegrationIcon({ bgColor, initials }: { bgColor: string; initials: string }) {
  return (
    <div className={`${bgColor} text-white rounded-xl w-10 h-10 flex items-center justify-center text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  cardState,
  onSave,
  onDraftChange,
}: {
  integration: Integration;
  cardState: CardState;
  onSave: (value: string) => void;
  onDraftChange: (draft: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      onDraftChange(text.trim());
    } catch {
      // clipboard access denied — user can type manually
    }
  }

  function handleFile(file: File) {
    onDraftChange(file.name);
    onSave(file.name);
  }

  return (
    <div className="rounded-2xl border border-border p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <IntegrationIcon bgColor={integration.bgColor} initials={integration.initials} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{integration.name}</span>
              <MethodBadge method={integration.method} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{integration.hint}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={cardState.status} />
        </div>
      </div>

      {/* Connection UI */}
      {integration.method === "oauth" && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled
            className="bg-green-600 hover:bg-green-700 text-white opacity-70"
          >
            Connect {integration.name}
          </Button>
          <span className="text-[11px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            coming soon
          </span>
        </div>
      )}

      {integration.method === "api_key" && cardState.status !== "connected" && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="password"
              autoComplete="off"
              value={cardState.draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Paste API key…"
              className="pr-9"
            />
            <button
              type="button"
              title="Paste from clipboard"
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Clipboard className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!cardState.draft.trim()}
            onClick={() => onSave(cardState.draft.trim())}
          >
            Save
          </Button>
        </div>
      )}

      {integration.method === "api_key" && cardState.status === "connected" && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => onDraftChange("")}
        >
          Replace key
        </button>
      )}

      {integration.method === "csv" && cardState.status !== "connected" && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            }`}
          >
            <Upload className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Drop CSV here or <span className="text-accent">click to browse</span>
            </p>
          </div>
        </>
      )}

      {integration.method === "csv" && cardState.status === "connected" && (
        <p className="text-xs text-muted-foreground">
          File: <span className="font-medium text-foreground">{cardState.draft}</span>
          {" "}·{" "}
          <button type="button" className="hover:underline" onClick={() => onDraftChange("")}>
            replace
          </button>
        </p>
      )}

      {cardState.errorMsg && (
        <p className="text-xs text-destructive">{cardState.errorMsg}</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StepIntegrations({
  businessType,
  value,
  onChange,
  onBack,
  onNext,
  submitting,
}: {
  businessType: string;
  value: IntegrationValues;
  onChange: (v: IntegrationValues) => void;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const { primary, secondary } = getIntegrationsForBusiness(businessType || "other");
  const [showSecondary, setShowSecondary] = useState(false);

  // Per-card draft + status state (separate from parent's committed values)
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  function getCardState(id: string): CardState {
    return cardStates[id] ?? {
      status: value[id] ? "connected" : "idle",
      draft: value[id] ?? "",
    };
  }

  function updateDraft(id: string, draft: string) {
    setCardStates((prev) => ({
      ...prev,
      [id]: { ...getCardState(id), draft, status: draft ? "idle" : "idle" },
    }));
  }

  function saveValue(id: string, savedValue: string) {
    setCardStates((prev) => ({
      ...prev,
      [id]: { ...getCardState(id), draft: savedValue, status: "connected" },
    }));
    onChange({ ...value, [id]: savedValue });
  }

  const connectedCount = Object.values(cardStates).filter((s) => s.status === "connected").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-primary">Connect your tools</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All integrations are optional — connect what you have now, skip the rest.
        </p>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-accent flex-shrink-0" />
        API keys are encrypted before storage and never shown again.
      </p>

      {/* Primary integrations */}
      <div className="space-y-3">
        {primary.map((integ) => (
          <IntegrationCard
            key={integ.id}
            integration={integ}
            cardState={getCardState(integ.id)}
            onSave={(v) => saveValue(integ.id, v)}
            onDraftChange={(d) => updateDraft(integ.id, d)}
          />
        ))}
      </div>

      {/* Secondary integrations (hidden until expanded) */}
      {secondary.length > 0 && (
        <>
          {showSecondary && (
            <div className="space-y-3">
              {secondary.map((integ) => (
                <IntegrationCard
                  key={integ.id}
                  integration={integ}
                  cardState={getCardState(integ.id)}
                  onSave={(v) => saveValue(integ.id, v)}
                  onDraftChange={(d) => updateDraft(integ.id, d)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSecondary((s) => !s)}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-accent py-1 transition-colors"
          >
            {showSecondary ? (
              <><ChevronUp className="h-4 w-4" /> Show fewer integrations</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Add another integration ({secondary.length} more)</>
            )}
          </button>
        </>
      )}

      {connectedCount > 0 && (
        <p className="text-xs text-green-600 font-medium text-center">
          {connectedCount} integration{connectedCount !== 1 ? "s" : ""} connected
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" size="xl" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button
          type="button"
          variant="brand"
          size="xl"
          className="flex-1"
          onClick={onNext}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Continue to payment"}
        </Button>
      </div>
    </div>
  );
}
