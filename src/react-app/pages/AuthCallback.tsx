import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/react-app/lib/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const callbackUrl = window.location.href;
        const searchParams = new URLSearchParams(window.location.search);
        const callbackError = searchParams.get("error");
        const callbackErrorDescription = searchParams.get("error_description");
        if (callbackError) {
          throw new Error(callbackErrorDescription || callbackError);
        }

        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const hasTokenHash = hashParams.has("access_token") && hashParams.has("refresh_token");

        if (hasTokenHash) {
          const access_token = hashParams.get("access_token");
          const refresh_token = hashParams.get("refresh_token");

          if (!access_token || !refresh_token) {
            throw new Error("Missing authentication tokens in callback URL.");
          }

          const { error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (setSessionError) {
            throw setSessionError;
          }
        } else {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(callbackUrl);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        navigate("/", { replace: true });
      } catch (err) {
        console.error("Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      }
    };

    handleCallback();
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
