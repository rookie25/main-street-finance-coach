import { useCallback, useEffect, useState } from "react";
import {
  usePlaidLink,
  type PlaidLinkOnSuccessMetadata,
  type PlaidLinkOnExitMetadata,
  type PlaidLinkError,
} from "react-plaid-link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createPlaidLinkToken, exchangePlaidPublicToken, ApiError, PLAID_OAUTH_STASH_KEY,
} from "@/lib/onboardApi";

/**
 * Plaid Link is a modal SDK (not a redirect), so it can't reuse the generic
 * Square OAuth button. This self-contained button:
 *   1. fetches a link_token from the backend on click,
 *   2. opens Plaid Link with it,
 *   3. exchanges the public_token server-side on success.
 * The bank access token is never exposed to the browser.
 */
export default function PlaidConnectButton({
  token,
  onConnecting,
  onConnected,
  onError,
}: {
  token: string;
  onConnecting?: () => void;
  onConnected: () => void;
  onError: (message: string) => void;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setExchanging(true);
      try {
        await exchangePlaidPublicToken({
          token,
          public_token: publicToken,
          institution_name: metadata.institution?.name ?? undefined,
          accounts: metadata.accounts,
        });
        onConnected();
      } catch (err) {
        onError(err instanceof ApiError ? err.message : "Could not link your bank. Please try again.");
      } finally {
        setExchanging(false);
        setLinkToken(null);
        // In-place (non-OAuth) success — the stash is no longer needed.
        try { localStorage.removeItem(PLAID_OAUTH_STASH_KEY); } catch { /* ignore */ }
      }
    },
    [token, onConnected, onError],
  );

  const onExit = useCallback(
    (err: PlaidLinkError | null, _meta: PlaidLinkOnExitMetadata) => {
      setLinkToken(null);
      if (err) onError("Bank connection didn't complete. You can try again.");
    },
    [onError],
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess, onExit });

  // Open the modal as soon as Link is ready with a fresh token.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  async function handleClick() {
    onConnecting?.();
    try {
      const { link_token } = await createPlaidLinkToken(token);
      // Stash so an OAuth bank's full-page redirect can resume on the return page.
      try {
        localStorage.setItem(
          PLAID_OAUTH_STASH_KEY,
          JSON.stringify({ link_token, onboarding_token: token, ts: Date.now() }),
        );
      } catch { /* localStorage unavailable — non-OAuth banks still work in-place */ }
      setLinkToken(link_token);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not start the bank connection.");
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={exchanging}
      className="bg-blue-600 hover:bg-blue-700 text-white"
      onClick={handleClick}
    >
      {exchanging && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
      Connect your bank
    </Button>
  );
}
