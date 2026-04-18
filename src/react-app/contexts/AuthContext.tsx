import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EmailOtpType, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/react-app/lib/supabase";
import { authTelemetry } from "@/react-app/lib/authTelemetry";

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

    const exchangeAuthPayloadFromUrl = async () => {
      if (window.location.pathname === "/auth/callback") {
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type") as EmailOtpType | null;

      if (!code && !(tokenHash && otpType)) {
        return;
      }

      authTelemetry.info({
        stage: "callback",
        event: "callback_payload_detected_outside_callback_route",
        outcome: "attempt",
        details: {
          path: window.location.pathname,
          hasCode: Boolean(code),
          hasTokenHash: Boolean(tokenHash),
        },
      });

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          authTelemetry.error({
            stage: "callback",
            event: "token_exchange_failed_outside_callback_route",
            outcome: "failure",
            details: {
              message: error.message,
              path: window.location.pathname,
            },
          });
          throw error;
        }
      } else if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (error) {
          authTelemetry.error({
            stage: "callback",
            event: "magic_link_verify_failed_outside_callback_route",
            outcome: "failure",
            details: {
              message: error.message,
              path: window.location.pathname,
            },
          });
          throw error;
        }
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      authTelemetry.info({
        stage: "callback",
        event: "callback_payload_exchanged_outside_callback_route",
        outcome: "success",
        details: {
          path: window.location.pathname,
        },
      });
    };

    const bootstrapSession = async () => {
      authTelemetry.info({
        stage: "start",
        event: "session_bootstrap_started",
        outcome: "attempt",
      });
      await exchangeAuthPayloadFromUrl();
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
