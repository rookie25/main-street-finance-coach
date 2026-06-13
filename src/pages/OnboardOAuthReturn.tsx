import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePlaidLink,
  type PlaidLinkOnSuccessMetadata,
  type PlaidLinkOnExitMetadata,
  type PlaidLinkError,
} from "react-plaid-link";
import { Loader2, AlertTriangle } from "lucide-react";
import { exchangePlaidPublicToken, ApiError, PLAID_OAUTH_STASH_KEY } from "@/lib/onboardApi";
import { completePlaidRelink } from "@/lib/clientApi";

/**
 * Plaid OAuth return page (route: /onboard/oauth — registered as PLAID_REDIRECT_URI).
 *
 * OAuth banks redirect the whole browser to the bank and back here with
 * `?oauth_state_id=…`. We recover the link_token + onboarding token stashed by
 * PlaidConnectButton, re-initialize Plaid Link with `receivedRedirectUri` to
 * resume the flow, exchange the public_token, then send the user back to their
 * onboarding wizard at step 2.
 */
export default function OnboardOAuthReturn() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const isOAuthReturn = useMemo(
    () => new URLSearchParams(window.location.search).has("oauth_state_id"),
    [],
  );

  const stash = useMemo(() => {
    try {
      const raw = localStorage.getItem(PLAID_OAUTH_STASH_KEY);
      return raw ? (JSON.parse(raw) as {
        link_token: string;
        onboarding_token?: string;
        mode?: "relink";
        item_id?: string | null;
        return_to?: string;
      }) : null;
    } catch {
      return null;
    }
  }, []);

  const finish = useCallback(
    (status: "connected" | "error") => {
      try { localStorage.removeItem(PLAID_OAUTH_STASH_KEY); } catch { /* ignore */ }
      if (stash?.mode === "relink") {
        // Relink came from the client portal — return there.
        navigate(stash.return_to || "/app", { replace: true });
        return;
      }
      const t = stash?.onboarding_token;
      navigate(
        t ? `/onboard/${encodeURIComponent(t)}?step=2&plaid=${status}` : "/",
        { replace: true },
      );
    },
    [navigate, stash],
  );

  const onSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      if (!stash) return finish("error");
      try {
        if (stash.mode === "relink") {
          // Update mode: no exchange — just mark the connection healthy again.
          await completePlaidRelink(stash.item_id ?? undefined);
        } else {
          await exchangePlaidPublicToken({
            token: stash.onboarding_token!,
            public_token: publicToken,
            institution_name: metadata.institution?.name ?? undefined,
            accounts: metadata.accounts,
          });
        }
        finish("connected");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not finish connecting your bank.");
        setTimeout(() => finish("error"), 2500);
      }
    },
    [stash, finish],
  );

  const onExit = useCallback(
    (_err: PlaidLinkError | null, _meta: PlaidLinkOnExitMetadata) => finish("error"),
    [finish],
  );

  const { open, ready } = usePlaidLink({
    token: stash?.link_token ?? null,
    receivedRedirectUri: isOAuthReturn ? window.location.href : undefined,
    onSuccess,
    onExit,
  });

  useEffect(() => {
    // Guard: this page only makes sense as a Plaid OAuth redirect target.
    if (!isOAuthReturn || !stash) {
      setError("This page finishes a bank connection. Please start from your onboarding link.");
      const t = setTimeout(() => finish("error"), 2500);
      return () => clearTimeout(t);
    }
    if (ready) open();
  }, [isOAuthReturn, stash, ready, open, finish]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        {error ? (
          <>
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-muted-foreground max-w-sm">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Finishing your bank connection…</p>
          </>
        )}
      </div>
    </div>
  );
}
