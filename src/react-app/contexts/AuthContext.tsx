import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/react-app/lib/supabase";

type SignInProvider = "google";

interface AuthContextValue {
  user: User | null;
  isPending: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  redirectToLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getCallbackUrl() {
  return `${window.location.origin}/auth/callback`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      setIsPending(false);
    };

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setIsPending(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google" as SignInProvider,
      options: {
        redirectTo: getCallbackUrl(),
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      throw new Error("Email is required.");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getCallbackUrl(),
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const redirectToLogin = useCallback(async () => {
    await signInWithGoogle();
  }, [signInWithGoogle]);

  const value = useMemo(
    () => ({ user, isPending, signInWithGoogle, signInWithMagicLink, signOut, redirectToLogin }),
    [user, isPending, signInWithGoogle, signInWithMagicLink, signOut, redirectToLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
