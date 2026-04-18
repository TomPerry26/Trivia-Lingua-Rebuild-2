import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/react-app/lib/supabase";
import { authTelemetry } from "@/react-app/lib/authTelemetry";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const callbackError = searchParams.get("error");
        const callbackErrorDescription = searchParams.get("error_description");
        authTelemetry.info({
          stage: "callback",
          event: "callback_received",
          outcome: "attempt",
        });

        if (callbackError) {
          authTelemetry.error({
            stage: "callback",
            event: "callback_error_param",
            outcome: "failure",
            details: {
              callbackError,
              callbackErrorDescription,
            },
          });
          throw new Error(callbackErrorDescription || callbackError);
        }

        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const otpType = searchParams.get("type") as EmailOtpType | null;

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            authTelemetry.error({
              stage: "callback",
              event: "token_exchange_failed",
              outcome: "failure",
              details: { message: exchangeError.message },
            });
            throw exchangeError;
          }
          authTelemetry.info({
            stage: "callback",
            event: "token_exchange_succeeded",
            outcome: "success",
          });
        } else if (tokenHash && otpType) {
          authTelemetry.info({
            stage: "callback",
            event: "otp_verify_started",
            outcome: "attempt",
          });
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (verifyError) {
            authTelemetry.error({
              stage: "callback",
              event: "magic_link_verify_failed",
              outcome: "failure",
              details: { message: verifyError.message },
            });
            throw verifyError;
          }
          authTelemetry.info({
            stage: "callback",
            event: "magic_link_verify_succeeded",
            outcome: "success",
          });
        } else {
          authTelemetry.error({
            stage: "callback",
            event: "callback_payload_unsupported",
            outcome: "failure",
            details: { hasCode: Boolean(code), hasTokenHash: Boolean(tokenHash), hasOtpType: Boolean(otpType) },
          });
          throw new Error("Unsupported authentication callback payload.");
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          authTelemetry.error({
            stage: "session_ready",
            event: "session_lookup_failed",
            outcome: "failure",
            details: { message: sessionError.message },
          });
          throw sessionError;
        }

        if (!sessionData.session?.user) {
          authTelemetry.error({
            stage: "session_ready",
            event: "session_user_missing",
            outcome: "failure",
          });
          throw new Error("Authentication completed but no user session was found.");
        }

        window.history.replaceState({}, document.title, "/auth/callback");
        authTelemetry.info({
          stage: "session_ready",
          event: "callback_completed",
          outcome: "success",
        });
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Authentication error:", err);
        authTelemetry.error({
          stage: "callback",
          event: "callback_failed",
          outcome: "failure",
          details: { message: err instanceof Error ? err.message : "unknown callback error" },
        });
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      }
    };

    void handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <p className="text-red-600 text-center mb-4">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="animate-spin mb-4">
        <Loader2 className="w-12 h-12 text-orange-500" />
      </div>
      <p className="text-gray-600">Completing sign in...</p>
    </div>
  );
}
