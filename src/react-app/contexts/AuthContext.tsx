import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/react-app/lib/supabase";
import { authTelemetry } from "@/react-app/lib/authTelemetry";
import { queryClient } from "@/react-app/lib/queryClient";

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
      authTelemetry.info({
        stage: "start",
        event: "session_bootstrap_started",
        outcome: "attempt",
      });
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      setIsPending(false);
      authTelemetry.info({
        stage: "session_ready",
        event: "session_bootstrap_completed",
        outcome: "success",
        details: {
          hasUser: Boolean(data.session?.user),
        },
      });
    };

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setIsPending(false);
      void queryClient.invalidateQueries({ queryKey: ["quizzes-paginated"] });
      void queryClient.invalidateQueries({ queryKey: ["home-data"] });
      void queryClient.invalidateQueries({ queryKey: ["difficulty-quizzes"] });
      void queryClient.invalidateQueries({ queryKey: ["topic-quizzes"] });
      authTelemetry.info({
        stage: "session_ready",
        event: "auth_state_changed",
        outcome: "success",
        details: {
          hasUser: Boolean(session?.user),
        },
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    authTelemetry.info({
      stage: "start",
      event: "google_sign_in_started",
      outcome: "attempt",
    });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google" as SignInProvider,
      options: {
        redirectTo: getCallbackUrl(),
      },
    });

    if (error) {
      authTelemetry.error({
        stage: "redirect",
        event: "google_sign_in_failed",
        outcome: "failure",
        details: { message: error.message },
      });
      throw error;
    }

    authTelemetry.info({
      stage: "redirect",
      event: "google_redirect_initiated",
      outcome: "success",
      details: { redirectTo: getCallbackUrl() },
    });
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      throw new Error("Email is required.");
    }

    authTelemetry.info({
      stage: "start",
      event: "magic_link_sign_in_started",
      outcome: "attempt",
      details: { emailDomain: normalizedEmail.split("@")[1] ?? null },
    });
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getCallbackUrl(),
      },
    });

    if (error) {
      authTelemetry.error({
        stage: "redirect",
        event: "magic_link_send_failed",
        outcome: "failure",
        details: { message: error.message },
      });
      throw error;
    }

    authTelemetry.info({
      stage: "redirect",
      event: "magic_link_sent",
      outcome: "success",
      details: { emailDomain: normalizedEmail.split("@")[1] ?? null },
    });
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
