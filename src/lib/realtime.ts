// Resilient wrappers for Supabase Realtime channels.
//
// A blocked or failed WebSocket (e.g. CSP, a corporate network that blocks
// wss://, or a Realtime outage) makes supabase-js throw synchronously from
// .subscribe() — which, inside a React effect, propagates to the global
// ErrorBoundary and white-screens the whole app. These helpers contain that
// failure so live updates degrade gracefully: the UI still works, it just
// won't auto-refresh (data still loads via the normal fetch/query paths).
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/** Build + subscribe to a channel, returning null instead of throwing on failure. */
export function safeChannel(build: () => RealtimeChannel): RealtimeChannel | null {
  try {
    return build();
  } catch (e) {
    console.warn("[realtime] subscribe failed — continuing without live updates", e);
    return null;
  }
}

/** Remove a channel, tolerating null and any teardown error. */
export function safeRemoveChannel(channel: RealtimeChannel | null): void {
  if (!channel) return;
  try {
    supabase.removeChannel(channel);
  } catch {
    /* ignore */
  }
}
