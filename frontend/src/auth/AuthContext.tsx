import type { Session, User } from "@supabase/supabase-js";
import { createContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/types";

export type AuthRole = "admin" | "standard" | null;

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: AuthRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchRole(userId: string): Promise<AuthRole> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<Pick<Profile, "role">>();
  return data?.role ?? "standard";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AuthRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) {
        setRole(await fetchRole(data.session.user.id));
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setRole(newSession ? await fetchRole(newSession.user.id) : null);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    role,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
