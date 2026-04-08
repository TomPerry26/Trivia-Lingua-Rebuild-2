import { useAuth } from "@getmocha/users-service/react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        
        if (!code) {
          setError("No authorization code found. Please try logging in again.");
          return;
        }

        // Exchange code for session token (stored in httpOnly cookie)
        await exchangeCodeForSessionToken();
        
        // Navigate to home - AuthProvider will automatically fetch user
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate, searchParams]);

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
