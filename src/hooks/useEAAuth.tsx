// EA Portal auth context (Component 3).
// Tracks the Supabase session, exposes the current user, and provides
// email/password sign-in, Google SSO, password reset, and sign-out.
// Wraps the entire /ea/* subtree so the login page, the RequireAuth guard,
// and the layout all share one source of truth.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface EAAuthValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const EAAuthContext = createContext<EAAuthValue | undefined>(undefined);

export function EAAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Restore any persisted session on mount.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    // Keep in sync: sign-in, sign-out, token refresh, OAuth callback, other tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/ea` },
    });
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <EAAuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signInWithGoogle,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </EAAuthContext.Provider>
  );
}

export function useEAAuth(): EAAuthValue {
  const ctx = useContext(EAAuthContext);
  if (!ctx) throw new Error("useEAAuth must be used within an EAAuthProvider");
  return ctx;
}
