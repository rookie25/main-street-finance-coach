import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnExitMetadata, type PlaidLinkError } from "react-plaid-link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPlaidRelinkToken, completePlaidRelink, ApiError } from "@/lib/clientApi";
import { PLAID_OAUTH_STASH_KEY } from "@/lib/onboardApi";

/**
 * Reconnect an expired bank via Plaid Link UPDATE mode (#12a). Shown when
 * /client/connection-health reports needs_bank_relink. For non-OAuth banks the
 * modal completes in place; OAuth banks redirect out and resume on /onboard/oauth
 * (the single registered Plaid redirect URI), which finishes the relink via the
 * stashed mode.
 */
export default function PlaidRelinkButton() {
  const qc = useQueryClient();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clearStash = () => {
    try { localStorage.removeItem(PLAID_OAUTH_STASH_KEY); } catch { /* ignore */ }
  };

  const onSuccess = useCallback(async () => {
    setBusy(true);
    try {
      await completePlaidRelink(itemId);
      toast.success("Bank reconnected — syncing will catch up overnight.");
      qc.invalidateQueries({ queryKey: ["client", "connection-health"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't finish reconnecting.");
    } finally {
      setBusy(false);
      setLinkToken(null);
      clearStash();
    }
  }, [itemId, qc]);

  const onExit = useCallback(
    (_err: PlaidLinkError | null, _m: PlaidLinkOnExitMetadata) => { setLinkToken(null); },
    [],
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess, onExit });
  useEffect(() => { if (linkToken && ready) open(); }, [linkToken, ready, open]);

  async function handleClick() {
    setBusy(true);
    try {
      const { link_token, item_id } = await createPlaidRelinkToken();
      setItemId(item_id);
      // Stash so an OAuth bank's redirect can resume on /onboard/oauth.
      try {
        localStorage.setItem(
          PLAID_OAUTH_STASH_KEY,
          JSON.stringify({ mode: "relink", link_token, item_id, return_to: "/app", ts: Date.now() }),
        );
      } catch { /* ignore */ }
      setLinkToken(link_token);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't start reconnecting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={handleClick}
      className="border-amber-300 text-amber-700 hover:bg-amber-50"
    >
      {busy ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1.5 h-3 w-3" />}
      Reconnect bank
    </Button>
  );
}
