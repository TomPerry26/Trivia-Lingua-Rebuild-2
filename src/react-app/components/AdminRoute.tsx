import { useAuth } from "@/react-app/contexts/AuthContext";
import { Navigate } from "react-router";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before checking admin status
    if (isPending) {
      return;
    }

    // If no user after auth loads, they're not logged in
    if (!user) {
      setIsAdmin(false);
      setIsChecking(false);
      return;
    }

    // User is logged in, check if admin
    setIsChecking(true);
    fetch("/api/users/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setIsAdmin(data?.access_level === "beta");
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setIsChecking(false));
  }, [user, isPending]);

  // Show loading while auth is pending OR while checking admin status
  if (isPending || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-orange-500" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
