// Shows a "new version available" toast when the service worker detects a new
// deploy, with a Refresh action that activates the new SW and reloads. Prevents
// installed PWA users from silently running a stale bundle after a release.
import { useEffect } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // A long-open installed PWA won't re-fetch on its own — poll hourly so a
      // new deploy is noticed without the user closing the app.
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast("A new version is available", {
      description: "Refresh to get the latest update.",
      duration: Infinity,
      action: {
        label: "Refresh",
        onClick: () => updateServiceWorker(true),
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
