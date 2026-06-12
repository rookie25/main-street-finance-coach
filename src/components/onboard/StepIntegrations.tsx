import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clipboard, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type Integration,
  type ConnectionStatus,
  getIntegrationsForBusiness,
} from "@/lib/integrations";
import { getSquareAuthUrl } from "@/lib/onboardApi";
import PlaidConnectButton from "./PlaidConnectButton";

// Record<integrationId, value — api key text, "oauth_connected", or csv filename>
export type IntegrationValues = Record<string, string>;

interface CardState {
  status: ConnectionStatus;
  draft: string;
  errorMsg?: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, errorMsg }: { status: ConnectionStatus; errorMsg?: string }) {
  if (status === "idle")       return <span className="text-xs text-muted-foreground">Not connected</span>;
  if (status === "connecting") return <span className="text-xs text-amber-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Connecting…</span>;
  if (status === "connected")  return <span className="text-xs font-medium text-green-600">✓ Connected</span>;
  return <span className="text-xs text-destructive" title={errorMsg}>✗ Error — try again</span>;
}

// ── Method badge ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: Integration["method"] }) {
  const styles = {
    oauth:   "bg-blue-50 text-blue-700 border-blue-200",
    api_key: "bg-amber-50 text-amber-700 border-amber-200",
    csv:     "bg-slate-100 text-slate-600 border-slate-200",
  };
  const labels = { oauth: "OAuth", api_key: "API Key", csv: "CSV" };
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${styles[method]}`}>
      {labels[method]}
    </span>
  );
}

// ── Initials icon ─────────────────────────────────────────────────────────────

function IntegrationIcon({ bgColor, initials }: { bgColor: string; initials: string }) {
  return (
    <div className={`${bgColor} text-white rounded-xl w-10 h-10 flex items-center justify-center text-xs font-bold flex-shrink-0 select-none`}>
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
  onOAuthConnect,
  connectSlot,
}: {
  integration: Integration;
  cardState: CardState;
  onSave: (value: string) => void;
  onDraftChange: (draft: string) => void;
  onOAuthConnect?: () => Promise<void>;
  // Custom connect UI for SDK-based flows (e.g. Plaid Link modal). When present,
  // it replaces the default redirect-OAuth button for an oauth-method card.
  connectSlot?: React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      onDraftChange(text.trim());
    } catch {
      // Clipboard access denied — user can type manually.
    }
  }

  function handleFile(file: File) {
    onDraftChange(file.name);
    onSave(file.name);
  }

  return (
    <div className="rounded-2xl border border-border p-4 space-y-3">
      {/* Header */}
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
          <StatusBadge status={cardState.status} errorMsg={cardState.errorMsg} />
        </div>
      </div>

      {/* Connection UI */}
      {integration.method === "oauth" && cardState.status !== "connected" && (
        <div className="flex items-center gap-2 flex-wrap">
          {connectSlot ? (
            // SDK-based flow (Plaid Link) — custom button supplied by the parent.
            connectSlot
          ) : onOAuthConnect ? (
            // Live OAuth flow
            <Button
              type="button"
              size="sm"
              disabled={cardState.status === "connecting"}
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={onOAuthConnect}
            >
              {cardState.status === "connecting" && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Connect {integration.name}
            </Button>
          ) : (
            // Not yet wired — coming soon
            <>
              <Button
                type="button"
                size="sm"
                disabled
                className="bg-green-600 hover:bg-green-700 text-white opacity-60"
              >
                Connect {integration.name}
              </Button>
              <span className="text-[11px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                coming soon
              </span>
            </>
          )}
        </div>
      )}

      {integration.method === "oauth" && cardState.status === "connected" && (
        <p className="text-xs text-green-600 font-medium">Account linked successfully.</p>
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
          {" · "}
          <button type="button" className="hover:underline" onClick={() => onDraftChange("")}>
            replace
          </button>
        </p>
      )}

      {cardState.errorMsg && cardState.status === "error" && (
        <p className="text-xs text-destructive">{cardState.errorMsg}</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StepIntegrations({
  token,
  businessType,
  value,
  onChange,
  errorOverrides = {},
  onBack,
  onNext,
  submitting,
}: {
  token: string;
  businessType: string;
  value: IntegrationValues;
  onChange: (v: IntegrationValues) => void;
  errorOverrides?: Record<string, string>;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const { primary, secondary } = getIntegrationsForBusiness(businessType || "other");
  const [showSecondary, setShowSecondary] = useState(false);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  function getCardState(id: string): CardState {
    // Explicit per-card state takes precedence.
    if (cardStates[id]) return cardStates[id];
    // Pre-loaded error from URL param (e.g. square=error on return).
    if (errorOverrides[id]) {
      return { status: "error", draft: "", errorMsg: errorOverrides[id] };
    }
    // Pre-loaded success from URL param (e.g. square=connected on return).
    if (value[id]) {
      return { status: "connected", draft: value[id] };
    }
    return { status: "idle", draft: "" };
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
      [id]: { status: "connected", draft: savedValue },
    }));
    onChange({ ...value, [id]: savedValue });
  }

  function setConnecting(id: string) {
    setCardStates((prev) => ({
      ...prev,
      [id]: { status: "connecting", draft: prev[id]?.draft ?? "" },
    }));
  }

  function setCardError(id: string, msg: string) {
    setCardStates((prev) => ({
      ...prev,
      [id]: { status: "error", draft: prev[id]?.draft ?? "", errorMsg: msg },
    }));
  }

  // Square OAuth — fetches the authorize URL then redirects the browser.
  async function handleSquareOAuth() {
    setConnecting("square");
    try {
      const { auth_url } = await getSquareAuthUrl(token);
      window.location.href = auth_url;
      // Browser navigates away — no further state update needed.
    } catch (err) {
      setCardError("square", "Could not start Square authorization. Please try again.");
      toast.error(err instanceof Error ? err.message : "Square connection failed.");
    }
  }

  // Map integration id → OAuth handler (add more here as we wire each one).
  function oauthHandler(integ: Integration): (() => Promise<void>) | undefined {
    if (integ.oauthReady && integ.id === "square") return handleSquareOAuth;
    return undefined;
  }

  // SDK-based connect UI (Plaid Link modal). Returned as a slot so the generic
  // IntegrationCard stays redirect-agnostic.
  function connectSlotFor(integ: Integration): React.ReactNode | undefined {
    if (integ.id === "plaid") {
      return (
        <PlaidConnectButton
          token={token}
          onConnecting={() => setConnecting("plaid")}
          onConnected={() => saveValue("plaid", "oauth_connected")}
          onError={(m) => setCardError("plaid", m)}
        />
      );
    }
    return undefined;
  }

  const connectedCount = [...primary, ...secondary].filter(
    (integ) => getCardState(integ.id).status === "connected",
  ).length;

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
            onOAuthConnect={oauthHandler(integ)}
            connectSlot={connectSlotFor(integ)}
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
                  onOAuthConnect={oauthHandler(integ)}
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
